/**
 * IELTS Speed Reading & Skimming / Scanning Pacer
 * Authentic Practice-level academic passages with adjustable WPM pacer (200, 250, 300 WPM),
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
  },
  {
    id: 'rd_3',
    title: 'The Metallurgy of Damascus Crucible Steel & Carbon Nanotubes',
    topic: 'Archaeology & History',
    wordCount: 480,
    targetMinutes: 2,
    paragraphs: [
      {
        id: 1,
        topicSentence: 'Medieval Damascus blades forged in the Near East between the ninth and seventeenth centuries achieved legendary status for their razor-sharp resilience and watered-silk surface patterns.',
        text: 'Medieval Damascus blades forged in the Near East between the ninth and seventeenth centuries achieved legendary status for their razor-sharp resilience and watered-silk surface patterns. Western Crusaders encountering these scimitars marveled at their capacity to cleave iron spears without dulling. Modern archaeometallurgy reveals that Damascus swords were hammered from cakes of "wootz" crucible steel imported from southern India and Sri Lanka, containing an unusually high carbon concentration of approximately 1.5 percent.'
      },
      {
        id: 2,
        topicSentence: 'High-resolution transmission electron microscopy of seventeenth-century Damascus blades uncovered the presence of carbon nanotubes encapsulating brittle cementite nanowires.',
        text: 'High-resolution transmission electron microscopy of seventeenth-century Damascus blades uncovered the presence of carbon nanotubes encapsulating brittle cementite nanowires. Trace impurities of vanadium, molybdenum, and chromium naturally present in Indian iron ore acted as catalytic nucleation sites during cyclic thermal forging. When eighteenth-century mines in Golconda were exhausted of vanadium-bearing ore, master blacksmiths could no longer precipitate the cementite bands, causing the ancestral forging art to vanish.'
      }
    ],
    questions: [
      {
        question: 'Where did the raw "wootz" crucible steel ingots used in Damascus blades originate?',
        options: [
          'Alpine iron mines in central Europe.',
          'Southern India and Sri Lanka.',
          'Volcanic quarries in Anatolia.',
          'Riverbed deposits in northern Spain.'
        ],
        correctIndex: 1,
        explanation: 'Paragraph 1 states that Damascus swords were hammered from cakes of wootz crucible steel imported from southern India and Sri Lanka.'
      },
      {
        question: 'Why did the art of forging authentic Damascus steel disappear in the eighteenth century?',
        options: [
          'Blacksmith guilds outlawed thermal cyclic forging.',
          'Gunpowder weapons made swords immediately illegal.',
          'Indian mines ran out of iron ore containing trace catalytic vanadium.',
          'European steel imports flooded Near Eastern markets.'
        ],
        correctIndex: 2,
        explanation: 'Paragraph 2 explains that when mines in Golconda were exhausted of vanadium-bearing ore, blacksmiths could no longer precipitate the cementite bands.'
      }
    ]
  },
  {
    id: 'rd_4',
    title: 'Perovskite Photovoltaics and the Terawatt Solar Transition',
    topic: 'Technology & Future',
    wordCount: 510,
    targetMinutes: 2,
    paragraphs: [
      {
        id: 1,
        topicSentence: 'For half a century, crystalline silicon has reigned as the undisputed workhorse of the global photovoltaic industry, yet its thermodynamic ceiling is fast approaching.',
        text: 'For half a century, crystalline silicon has reigned as the undisputed workhorse of the global photovoltaic industry, yet its thermodynamic ceiling is fast approaching. Under the Shockley-Queisser theoretical limit, a single-junction silicon solar cell can convert no more than 29.4 percent of incident solar photons into electrical current, as high-energy blue photons dissipate excess energy as waste heat. Furthermore, refining metallurgical quartz into solar-grade silicon ingots demands furnace temperatures exceeding 1,400°C.'
      },
      {
        id: 2,
        topicSentence: 'Metal-halide perovskites offer a transformative solution by stacking a wide-bandgap crystalline film directly atop a conventional silicon wafer.',
        text: 'Metal-halide perovskites offer a transformative solution by stacking a wide-bandgap crystalline film directly atop a conventional silicon wafer. In these "tandem" architectures, the top perovskite layer harvests high-frequency blue and green wavelengths of the solar spectrum, while longer-wavelength red and infrared photons pass through to be captured by the underlying silicon base. Laboratory tandem prototypes have already surpassed 33 percent efficiency, promising dramatic reductions in land footprint per megawatt.'
      }
    ],
    questions: [
      {
        question: 'What is a primary limitation of single-junction crystalline silicon solar cells mentioned in Paragraph 1?',
        options: [
          'They cannot absorb red or infrared wavelengths.',
          'High-energy blue photons lose excess energy as waste heat, capping efficiency below 29.4%.',
          'Quartz raw materials have been completely depleted globally.',
          'They only function at sub-zero temperatures.'
        ],
        correctIndex: 1,
        explanation: 'Paragraph 1 explains that under the Shockley-Queisser limit, single-junction silicon cells convert no more than 29.4% of solar photons because high-energy blue photons dissipate excess energy as heat.'
      },
      {
        question: 'How does a perovskite-silicon tandem solar cell achieve over 33% efficiency?',
        options: [
          'By using mirrors to concentrate sunlight tenfold.',
          'By cooling the silicon wafer with liquid nitrogen.',
          'The top perovskite layer captures blue/green light while red/infrared light passes to the silicon base.',
          'By replacing silicon entirely with gold electrodes.'
        ],
        correctIndex: 2,
        explanation: 'Paragraph 2 states that the top perovskite layer harvests blue and green wavelengths while red and infrared photons pass through to the underlying silicon base.'
      }
    ]
  },
  {
    id: 'rd_5',
    title: 'Cryobiosis and Intrinsically Disordered Proteins in Tardigrades',
    topic: 'Biology & Nature',
    wordCount: 450,
    targetMinutes: 2,
    paragraphs: [
      {
        id: 1,
        topicSentence: 'Microscopic eight-legged tardigrades—colloquially termed "water bears"—possess an extraordinary capacity to survive desiccation, vacuum radiation, and temperatures approaching absolute zero.',
        text: 'Microscopic eight-legged tardigrades—colloquially termed "water bears"—possess an extraordinary capacity to survive desiccation, vacuum radiation, and temperatures approaching absolute zero. When ambient moisture evaporates, tardigrades retract their limbs and enter a reversible ametabolic state known as anhydrobiosis, expelling over ninety-five percent of their intracellular water and reducing metabolic respiration to undetectable levels for decades.'
      },
      {
        id: 2,
        topicSentence: 'Rather than relying on trehalose sugars like brine shrimp, tardigrades synthesize unique tardigrade-specific intrinsically disordered proteins (TDPs) that vitrify their cytoplasm into biological glass.',
        text: 'Rather than relying on trehalose sugars like brine shrimp, tardigrades synthesize unique tardigrade-specific intrinsically disordered proteins (TDPs) that vitrify their cytoplasm into biological glass. This amorphous bioglass physically immobilizes cellular organelles and prevents protein unfolding or ice-crystal puncture. Pharmaceutical bioengineers are now utilizing cloned TDP matrices to stabilize fragile mRNA vaccines and blood-clotting factors at room temperature, eliminating the costly global cold-chain logistics network.'
      }
    ],
    questions: [
      {
        question: 'What happens to a tardigrade’s intracellular water during anhydrobiosis?',
        options: [
          'It freezes into hexagonal ice crystals.',
          'Over 95 percent of its intracellular water is expelled.',
          'It is converted into liquid nitrogen.',
          'It doubles in volume to protect the nucleus.'
        ],
        correctIndex: 1,
        explanation: 'Paragraph 1 explicitly states that tardigrades enter anhydrobiosis by expelling over ninety-five percent of their intracellular water.'
      },
      {
        question: 'What practical medical application are bioengineers developing from tardigrade proteins (TDPs)?',
        options: [
          'Synthesizing artificial red blood cells.',
          'Stabilizing fragile vaccines and pharmaceuticals at room temperature without refrigeration.',
          'Creating sunscreens for deep-sea divers.',
          'Replacing surgical sutures.'
        ],
        correctIndex: 1,
        explanation: 'Paragraph 2 notes that bioengineers use cloned TDP matrices to stabilize fragile mRNA vaccines and blood-clotting factors at room temperature.'
      }
    ]
  }
];

