/**
 * IELTS Speed Reading & Skimming / Scanning Pacer
 * Authentic Cambridge-level academic passages with adjustable WPM pacer (200, 250, 300 WPM),
 * topic sentence highlights, and timed comprehension check questions.
 */

export interface ReadingDrillItem {
  id: string;
  title: string;
  topic: 'Archaeology & History' | 'Biology & Nature' | 'Technology & Future' | 'Psychology & Society';
  wordCount: number;
  targetMinutes: number; // e.g. 3 minutes for 650 words
  paragraphs: {
    id: number;
    text: string;
    topicSentence: string;
  }[];
  questions: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

export const SPEED_READING_DRILLS: ReadingDrillItem[] = [
  {
    id: 'rd_1',
    title: 'The Enigma of Subterranean Bio-Luminescence',
    topic: 'Biology & Nature',
    wordCount: 420,
    targetMinutes: 2,
    paragraphs: [
      [
        {
          id: 1,
          topicSentence: 'Deep within abyssal ocean trenches, biological luminescence serves as the primary conduit for ecological survival.',
          text: 'Deep within abyssal ocean trenches, biological luminescence serves as the primary conduit for ecological survival. In an environment devoid of atmospheric solar penetration, specialized marine organisms generate cold biochemical light through the oxidation of luciferin catalyzed by the enzyme luciferase. Unlike terrestrial light sources that dissipate massive thermal energy, biological phosphorescence operates at near-perfect thermodynamic efficiency, converting up to ninety percent of chemical reactions directly into luminous radiance.'
        }
      ][0],
      [
        {
          id: 2,
          topicSentence: 'Evolutionary biologists have identified three distinct survival utilities for deep-sea luminescence: predation, camouflage, and inter-species communication.',
          text: 'Evolutionary biologists have identified three distinct survival utilities for deep-sea luminescence: predation, camouflage, and inter-species communication. For predatory species like the anglerfish, a glowing dorsal photophore functions as a deceptive lure, drawing unsuspecting prey toward gaping jaws. Conversely, mesopelagic squids utilize counter-illumination; photophores along their ventral belly emit subtle blue luminescence matching the downwelling sunlight from above, thereby rendering their silhouette virtually invisible to lurking abyssal predators below.'
        }
      ][0],
      [
        {
          id: 3,
          topicSentence: 'Recent technological breakthroughs in underwater submersibles are uncovering profound pharmacological applications for luciferase enzymes.',
          text: 'Recent technological breakthroughs in underwater submersibles are uncovering profound pharmacological applications for luciferase enzymes. Medical oncologists now utilize synthesized marine bioluminescent markers to track malignant cell mutations in real time without invasive biopsy procedures. By attaching luminescent proteins to targeted antibodies, genetic researchers can monitor microscopic pharmaceutical responses at cellular resolutions previously deemed scientifically impossible.'
        }
      ][0]
    ],
    questions: [
      {
        question: 'Why is biological luminescence considered thermodynamically superior to terrestrial artificial light?',
        options: [
          'It generates sunlight-spectrum beams.',
          'It converts nearly 90 percent of chemical energy into light without thermal loss.',
          'It requires no enzymatic catalyst.',
          'It penetrates oceanic rock strata.'
        ],
        correctIndex: 1,
        explanation: 'Paragraph 1 explicitly notes that biological phosphorescence converts up to ninety percent of chemical reactions directly into luminous radiance, unlike terrestrial sources that dissipate massive thermal energy.'
      },
      {
        question: 'How does counter-illumination aid mesopelagic squids?',
        options: [
          'It temporarily blinds predatory sharks.',
          'It lures smaller crustaceans directly into their tentacles.',
          'It matches downwelling sunlight, eliminating their visible silhouette from below.',
          'It increases their internal metabolic body heat.'
        ],
        correctIndex: 2,
        explanation: 'Paragraph 2 explains that photophores on the ventral belly emit subtle blue light matching downwelling sunlight from above, rendering their silhouette invisible to predators lurking below.'
      }
    ]
  },
  {
    id: 'rd_2',
    title: 'The Cognitive Architecture of Urban Navigational Wayfinding',
    topic: 'Psychology & Society',
    wordCount: 460,
    targetMinutes: 2,
    paragraphs: [
      [
        {
          id: 1,
          topicSentence: 'Human urban wayfinding relies upon an intricate mental schema known in neurobiology as the cognitive map.',
          text: 'Human urban wayfinding relies upon an intricate mental schema known in neurobiology as the cognitive map. Pioneering urban theorist Kevin Lynch posited that city dwellers orient their spatial consciousness around five canonical architectural archetypes: paths, edges, districts, nodes, and landmarks. When individuals traverse unfamiliar metropolitan grids, their neurological hippocampus systematically encodes salient visual monuments to anchor their spatial coordinates.'
        }
      ][0],
      [
        {
          id: 2,
          topicSentence: 'However, the omnipresence of satellite algorithmic navigation systems threatens to diminish natural spatial cognition.',
          text: 'However, the omnipresence of satellite algorithmic navigation systems threatens to diminish natural spatial cognition. Neuro-imaging studies conducted on regular GPS users indicate a marked reduction in hippocampal grey matter activation compared to traditional map readers and licensed taxi drivers. By delegating pathfinding computation to digital turn-by-turn prompts, human subjects fail to synthesize comprehensive panoramic spatial overviews, resulting in spatial disorientation whenever technological devices experience latency or battery failure.'
        }
      ][0]
    ],
    questions: [
      {
        question: 'What morphological neurological consequence is observed in habitual GPS users?',
        options: [
          'Enhanced peripheral visual acuity.',
          'Marked reduction in hippocampal grey matter activation during navigation.',
          'Permanent deterioration of auditory senses.',
          'Elevated synthesis of landmark memory nodes.'
        ],
        correctIndex: 1,
        explanation: 'Paragraph 2 states that neuro-imaging studies on regular GPS users indicate a marked reduction in hippocampal grey matter activation compared to traditional map readers.'
      }
    ]
  }
];
