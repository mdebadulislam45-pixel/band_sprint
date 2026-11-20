/**
 * IELTS Band Descriptors Decoder
 * Comparative matrix across Task 1, Task 2, and Speaking criteria for Bands 6, 7, 8, and 9.
 * Includes precise actionable advice for jumping from Band 6.5 to 7.5+.
 */

export interface DescriptorCriterion {
  criterionName: string;
  criterionCode: 'TR' | 'TA' | 'CC' | 'LR' | 'GRA' | 'FC' | 'PR';
  module: 'Writing Task 1' | 'Writing Task 2' | 'Speaking';
  bandDescriptions: {
    band: number;
    description: string;
    keyCharacteristics: string[];
  }[];
  howToJumpToBand7Plus: string[];
  commonMistakeThatKeepsYouAtBand6: string;
}

export const IELTS_BAND_DESCRIPTORS: DescriptorCriterion[] = [
  {
    criterionName: 'Task Response (TR)',
    criterionCode: 'TR',
    module: 'Writing Task 2',
    bandDescriptions: [
      {
        band: 6,
        description: 'Addresses all parts of the prompt, though some parts may be more fully covered than others. Presents a position with relevant main ideas, but some ideas may be inadequately developed or unclear.',
        keyCharacteristics: ['Ideas stated without deep extension', 'Position may be slightly repetitive or superficial', 'Tendency to over-generalize']
      },
      {
        band: 7,
        description: 'Addresses all parts of the prompt with a clear position throughout. Presents, extends, and supports main ideas with relevant evidence, though there may be a tendency to over-generalize in minor areas.',
        keyCharacteristics: ['Clear thesis from introduction to conclusion', 'Main ideas followed by concrete examples', 'Well-defined analytical paragraphs']
      },
      {
        band: 8,
        description: 'Sufficiently addresses all parts of the prompt. Presents a well-developed response with relevant, extended, and supported ideas throughout.',
        keyCharacteristics: ['Nuanced perspectives', 'Counter-arguments effectively dismantled', 'Thorough real-world examples']
      },
      {
        band: 9,
        description: 'Fully addresses all parts of the prompt with a sophisticated, fully developed response. The position is completely clear, convincing, and mature.',
        keyCharacteristics: ['Flawless argumentation', 'Exceptional depth of thought', 'Total task fulfillment']
      }
    ],
    howToJumpToBand7Plus: [
      'State your direct opinion clearly in BOTH the introduction and the conclusion.',
      'Ensure every body paragraph has: Topic Sentence -> Explanation -> Concrete Evidence/Example -> Concluding Consequence.',
      'Avoid sweeping claims: soften with academic hedging (e.g. "tends to exacerbate" instead of "ruins").'
    ],
    commonMistakeThatKeepsYouAtBand6: 'Listing 4 or 5 superficial reasons in bullet-like sentences without developing or illustrating any of them.'
  },
  {
    criterionName: 'Coherence and Cohesion (CC)',
    criterionCode: 'CC',
    module: 'Writing Task 2',
    bandDescriptions: [
      {
        band: 6,
        description: 'Arranges information coherently with clear overall progression. Uses cohesive devices effectively, but cohesion within and/or between sentences may be faulty or mechanical.',
        keyCharacteristics: ['Overuses "Firstly, Secondly, Furthermore, In conclusion"', 'Faulty pronoun referencing', 'Paragraphs have unclear central topics']
      },
      {
        band: 7,
        description: 'Logically organizes information and ideas with clear progression throughout. Uses a range of cohesive devices appropriately, although there may be some slight under-/over-use.',
        keyCharacteristics: ['Natural transitions between paragraphs', 'Skilled substitution to avoid repetition', 'Distinct central topic in each paragraph']
      },
      {
        band: 8,
        description: 'Sequences information and ideas logically. Manages all aspects of cohesion well. Uses paragraphing sufficiently and appropriately.',
        keyCharacteristics: ['Effortless linking across concepts', 'Seamless flow without mechanical markers']
      },
      {
        band: 9,
        description: 'Uses cohesion in such a way that it attracts no attention. The arrangement of ideas is organic, effortless, and compelling.',
        keyCharacteristics: ['Inconspicuous discourse management', 'Flawless paragraph progression']
      }
    ],
    howToJumpToBand7Plus: [
      'Stop starting every sentence with mechanical linkers ("Moreover", "In addition", "Besides").',
      'Use demonstrative reference words ("This phenomenon", "Such policy measures", "These adverse outcomes").',
      'Use concession subordinate clauses ("Although X is beneficial, Y remains vital...") to bridge two paragraphs.'
    ],
    commonMistakeThatKeepsYouAtBand6: 'Mechanical linker clutter: inserting "Furthermore", "However", "In contrast" at the beginning of 8 consecutive sentences.'
  },
  {
    criterionName: 'Lexical Resource (LR)',
    criterionCode: 'LR',
    module: 'Writing Task 2',
    bandDescriptions: [
      {
        band: 6,
        description: 'Uses an adequate range of vocabulary for the task. Attempts to use less common vocabulary but with some inaccuracy in word choice and collocation. Makes some errors in spelling and/or word formation.',
        keyCharacteristics: ['Repeated simple vocabulary', 'Noticeable collocation mismatches', 'Occasional spelling mistakes that do not impede communication']
      },
      {
        band: 7,
        description: 'Uses a sufficient range of vocabulary to allow some flexibility and precision. Uses less common lexical items with some awareness of style and collocation. May produce occasional errors in word choice and spelling.',
        keyCharacteristics: ['Natural topic-specific collocations', 'Accurate academic synonyms', 'Rare spelling slips']
      },
      {
        band: 8,
        description: 'Uses a wide range of vocabulary fluently and flexibly to convey precise meanings. Skillfully uses uncommon lexical items with only rare minor inaccuracies in collocation.',
        keyCharacteristics: ['Subtle register mastery', 'Sophisticated academic idioms and collocations']
      },
      {
        band: 9,
        description: 'Uses a wide range of vocabulary with total flexibility and precision. Natural and sophisticated control of lexical features; rare minor slips characteristic of native educated writers.',
        keyCharacteristics: ['Effortless native precision', 'Zero forced vocabulary']
      }
    ],
    howToJumpToBand7Plus: [
      'Learn words in collocations (e.g. "pose a grave threat", "bridge the socioeconomic divide"), not isolated dictionary lists.',
      'Paraphrase the prompt words using contextually accurate academic terms (e.g. "automobile emissions" instead of "car smoke").',
      'Check double-letter spelling traps (accommodation, environment, government, necessary).'
    ],
    commonMistakeThatKeepsYouAtBand6: 'Forcing bizarre, archaic GRE/SAT words ("perspicacious", "plethora", "ubiquitous") into awkward sentences where they sound artificial.'
  },
  {
    criterionName: 'Grammatical Range and Accuracy (GRA)',
    criterionCode: 'GRA',
    module: 'Writing Task 2',
    bandDescriptions: [
      {
        band: 6,
        description: 'Uses a mix of simple and complex sentence forms. Makes some errors in grammar and punctuation, but they rarely reduce communication.',
        keyCharacteristics: ['Frequent minor errors with articles, prepositions, and verb tenses', 'Complex sentences are prone to structural breakdown']
      },
      {
        band: 7,
        description: 'Uses a variety of complex structures. Produces frequent error-free sentences. Has good control of grammar and punctuation, but may make a few minor mistakes.',
        keyCharacteristics: ['Complex clauses (concession, relative, conditionals) handled with confidence', 'Majority of sentences are completely error-free']
      },
      {
        band: 8,
        description: 'Uses a wide range of structures. The majority of sentences are error-free. Makes only very occasional inaccuracies or non-systematic errors.',
        keyCharacteristics: ['Advanced inversion, cleft sentences, and reduced participle clauses with high accuracy']
      },
      {
        band: 9,
        description: 'Uses a full range of structures with full flexibility and accuracy; rare minor errors occur only as native slips of the pen.',
        keyCharacteristics: ['Native syntactic fluidity and complete punctuation control']
      }
    ],
    howToJumpToBand7Plus: [
      'Ensure at least 65% of your sentences are complex clauses (relative clauses, condition, concession).',
      'Include at least one inverted condition or negative inversion ("Had policymakers intervened...", "Not only does X...").',
      'Never commit comma splices: use a semicolon or period before "however", "therefore", and "furthermore".'
    ],
    commonMistakeThatKeepsYouAtBand6: 'Writing only simple Subject-Verb-Object sentences, or attempting complex sentences that break down into ungrammatical fragments.'
  }
];
