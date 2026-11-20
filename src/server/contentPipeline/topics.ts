/**
 * Standardized IELTS Examination Topic Bank (65+ Distinct Topics)
 * Spans Academic, General Training, and Daily-Life Domains.
 * Every batch generation draws from this list to ensure systematic curriculum breadth.
 */

export interface TopicItem {
  id: string;
  title: string;
  category: 'academic' | 'general' | 'daily_life';
  domain: string;
  subtopics: string[];
  recommendedModules: ('reading' | 'listening' | 'writing' | 'speaking')[];
  description: string;
}

export const TOPIC_BANK: TopicItem[] = [
  // ==========================================
  // ACADEMIC TOPICS (35 Topics)
  // ==========================================
  {
    id: 'acad_01',
    title: 'Glaciology & Cryosphere Dynamics',
    category: 'academic',
    domain: 'Earth Sciences & Climate',
    subtopics: ['Ice shelf calving mechanics', 'Subglacial lake hydrology', 'Albedo feedback loops', 'Meltwater runoff forecasting'],
    recommendedModules: ['reading', 'writing', 'speaking'],
    description: 'Investigation into glacier retreat rates, ice-sheet stability, and thermodynamic modeling of polar ice shelves.'
  },
  {
    id: 'acad_02',
    title: 'Deep-Sea Hydrothermal Vent Ecology',
    category: 'academic',
    domain: 'Marine Biology',
    subtopics: ['Chemosynthesis vs photosynthesis', 'Extremophile metabolic pathways', 'Mineral chimney precipitation', 'Benthic zone biodiversity'],
    recommendedModules: ['reading', 'listening', 'writing'],
    description: 'Biological adaptations in aphotic abyssal environments powered by geochemical heat vents.'
  },
  {
    id: 'acad_03',
    title: 'Astrobiology & Atmospheric Biosignatures',
    category: 'academic',
    domain: 'Space Sciences',
    subtopics: ['Spectroscopic atmospheric analysis', 'M-dwarf habitability zones', 'Prebiotic chemical precursors', 'Exoplanet transit photometry'],
    recommendedModules: ['reading', 'writing'],
    description: 'Techniques used by space telescopes to identify disequilibrium gases indicative of extraterrestrial biological activity.'
  },
  {
    id: 'acad_04',
    title: 'Cognitive Neuroscience of Memory Consolidation',
    category: 'academic',
    domain: 'Psychology & Neuroscience',
    subtopics: ['Hippocampal-neocortical dialogue', 'Slow-wave sleep spindles', 'Synaptic plasticity & LTP', 'Retroactive interference resistance'],
    recommendedModules: ['reading', 'listening', 'speaking'],
    description: 'Neurological processes transforming fragile short-term working memories into stable long-term cognitive schemas.'
  },
  {
    id: 'acad_05',
    title: 'Ancient Silk Road Metallurgy & Trade Archaeometry',
    category: 'academic',
    domain: 'Archaeology & History',
    subtopics: ['Lead isotope provenance tracing', 'Crucible steel manufacturing', 'Caravanserai exchange networks', 'Bronze coinage debasement'],
    recommendedModules: ['reading', 'writing'],
    description: 'Archaeometric analysis of trans-Eurasian material exchange and metallurgical technological transfer.'
  },
  {
    id: 'acad_06',
    title: 'Biomimicry in Structural Architecture',
    category: 'academic',
    domain: 'Architecture & Engineering',
    subtopics: ['Termite mound passive ventilation', 'Lotus effect superhydrophobic coatings', 'Bone trabecular load distribution', 'Honeycomb tensile structures'],
    recommendedModules: ['reading', 'writing', 'speaking'],
    description: 'Applying evolutionary adaptations in flora and fauna to achieve carbon-neutral, structurally resilient civil architecture.'
  },
  {
    id: 'acad_07',
    title: 'Renaissance Cartography & Navigation Geometry',
    category: 'academic',
    domain: 'History of Science',
    subtopics: ['Mercator projection distortions', 'Rhumb lines and portolan charts', 'Astrolabe and sextant calibration', 'Longitude problem chronometers'],
    recommendedModules: ['reading', 'listening'],
    description: 'Mathematical and geometrical advancements that reshaped early modern maritime navigation and imperial cartography.'
  },
  {
    id: 'acad_08',
    title: 'Quantum Cryptography & Quantum Key Distribution',
    category: 'academic',
    domain: 'Computer Science & Physics',
    subtopics: ['BB84 protocol', 'No-cloning theorem', 'Entangled photon polarizations', 'Post-quantum lattice cryptography'],
    recommendedModules: ['reading', 'writing'],
    description: 'Principles of quantum mechanical phenomena deployed to guarantee unbreakable communications channels.'
  },
  {
    id: 'acad_09',
    title: 'Urban Microclimates & Mitigation of Heat Islands',
    category: 'academic',
    domain: 'Urban Ecology',
    subtopics: ['High-albedo pavement materials', 'Vegetative evapotranspiration cooling', 'Urban canyon wind tunnels', 'Anthropogenic waste heat flux'],
    recommendedModules: ['reading', 'writing', 'speaking'],
    description: 'Empirical studies on temperature disparities between metropolitan cores and rural peripheries, and restorative design.'
  },
  {
    id: 'acad_10',
    title: 'Paleoclimatology & Polar Ice Core Analysis',
    category: 'academic',
    domain: 'Climatology',
    subtopics: ['Oxygen isotope fractionation (d18O)', 'Ancient atmospheric gas entrapment', 'Volcanic tephra chronological markers', 'Dansgaard-Oeschger rapid warming cycles'],
    recommendedModules: ['reading', 'writing'],
    description: 'Reconstructing quaternary paleoclimate epochs through cylindrical ice-core sampling in Greenland and Antarctica.'
  },
  {
    id: 'acad_11',
    title: 'Microbial Biodegradation of Synthetic Polymers',
    category: 'academic',
    domain: 'Biotechnology & Environmental Science',
    subtopics: ['Ideonella sakaiensis PETase enzymes', 'Bacterial biofilm surface colonization', 'Polyethylene degradation pathways', 'Microplastic bioaccumulation risks'],
    recommendedModules: ['reading', 'listening', 'writing'],
    description: 'Enzymatic engineering of bacteria capable of depolymerizing persistent synthetic plastics in marine and landfill contexts.'
  },
  {
    id: 'acad_12',
    title: 'Linguistic Typology & Grammaticalization of Dialects',
    category: 'academic',
    domain: 'Linguistics',
    subtopics: ['Phonological shift trajectories', 'Morphemic attrition and agglutination', 'Language obsolescence prevention', 'Pidgin to creole transitions'],
    recommendedModules: ['reading', 'speaking'],
    description: 'Structural evolution of world languages, examining syntactic diversity and morphological transition patterns.'
  },
  {
    id: 'acad_13',
    title: 'Artificial Photosynthesis & Photoelectrochemical Cells',
    category: 'academic',
    domain: 'Chemical Engineering',
    subtopics: ['Solar water splitting semiconductors', 'Cobalt-phosphate water oxidation catalysts', 'Proton exchange membranes', 'Solar-to-hydrogen conversion efficiency'],
    recommendedModules: ['reading', 'writing'],
    description: 'Replicating biological light-harvesting complexes with synthetic catalyst arrays to produce storable clean hydrogen fuels.'
  },
  {
    id: 'acad_14',
    title: 'Pleistocene Megafauna Extinctions',
    category: 'academic',
    domain: 'Paleontology & Evolutionary Biology',
    subtopics: ['Overkill hypothesis vs climate shifts', 'Radiocarbon bone assemblage dating', 'Keystone herbivore ecosystem collapses', 'Hyperdisease viral theories'],
    recommendedModules: ['reading', 'listening'],
    description: 'The debate over human hunting pressure versus abrupt climate transitions during late Quaternary extinctions.'
  },
  {
    id: 'acad_15',
    title: 'Behavioral Economics & Choice Architecture',
    category: 'academic',
    domain: 'Economics & Behavioral Sciences',
    subtopics: ['Default bias & opt-out frameworks', 'Hyperbolic discounting of future payoffs', 'Prospect theory loss aversion', 'Social norm nudging mechanisms'],
    recommendedModules: ['reading', 'writing', 'speaking'],
    description: 'Empirical experiments demonstrating cognitive departures from classical rational-actor economic theory.'
  },
  {
    id: 'acad_16',
    title: 'Magnetoreception in Avian Migratory Navigation',
    category: 'academic',
    domain: 'Zoology & Biophysics',
    subtopics: ['Cryptochrome radical pair mechanisms', 'Trigeminal nerve magnetic innervation', 'Celestial polarized light calibration', 'Geomagnetic anomaly disturbances'],
    recommendedModules: ['reading', 'listening'],
    description: 'Biophysical sensory mechanisms enabling trans-continental navigational precision in migratory birds.'
  },
  {
    id: 'acad_17',
    title: 'High-Speed Maglev Aerodynamics & Noise Abatement',
    category: 'academic',
    domain: 'Transportation Engineering',
    subtopics: ['Electrodynamic suspension coils', 'Tunnel sonic micro-boom suppression', 'Pantograph aerodynamic drag reduction', 'Eddy current braking dissipation'],
    recommendedModules: ['reading', 'writing'],
    description: 'Engineering solutions for magnetic levitation train design, focusing on acoustic barrier geometry and supersonic air compression.'
  },
  {
    id: 'acad_18',
    title: 'Volcanology & Pyroclastic Density Currents',
    category: 'academic',
    domain: 'Geophysics',
    subtopics: ['Basal shear boundary layer fluidization', 'Plinian eruption column collapse models', 'Acoustic infrasound sensor triangulation', 'Tephra dispersal wind modeling'],
    recommendedModules: ['reading', 'writing'],
    description: 'Thermodynamics and hazard mapping of high-velocity volcanic pyroclastic flows and volcanic ash cloud dispersal.'
  },
  {
    id: 'acad_19',
    title: 'Computational Linguistics & Neural Machine Translation',
    category: 'academic',
    domain: 'Artificial Intelligence & Linguistics',
    subtopics: ['Transformer self-attention architectures', 'Cross-lingual zero-shot transfer', 'Semantic vector space alignment', 'Idiomatic translation hallucinations'],
    recommendedModules: ['reading', 'writing', 'speaking'],
    description: 'Deep neural networks for natural language understanding and machine translation parity with human translators.'
  },
  {
    id: 'acad_20',
    title: 'Soil Microbiome & Mycorrhizal Fungal Networks',
    category: 'academic',
    domain: 'Agronomy & Ecology',
    subtopics: ['Arbuscular mycorrhizal phosphorus transport', 'Glomalin soil aggregate stabilization', 'Common mycorrhizal warning networks', 'Tillage disruption of fungal hyphae'],
    recommendedModules: ['reading', 'listening', 'writing'],
    description: 'Symbiotic fungal-plant root networks facilitating subterranean nutrient exchange and soil carbon sequestration.'
  },
  {
    id: 'acad_21',
    title: 'Acoustic Engineering of Ancient Amphitheaters',
    category: 'academic',
    domain: 'Archaeology & Classical Architecture',
    subtopics: ['Epidaurus limestone seat sound filtering', 'Echo cancellation through stepped geometry', 'Low-frequency ambient noise suppression', 'Speech intelligibility measurements (STI)'],
    recommendedModules: ['reading', 'listening'],
    description: 'How Hellenistic and Roman architects achieved speech clarity across open-air theaters holding 14,000 spectators.'
  },
  {
    id: 'acad_22',
    title: 'Circadian Photobiology & Non-Visual Ocular Pathways',
    category: 'academic',
    domain: 'Human Biology & Medicine',
    subtopics: ['Intrinsically photosensitive retinal ganglion cells', 'Melanopsin spectral sensitivity (480nm)', 'Suprachiasmatic nucleus melatonin inhibition', 'Shift work metabolic dysregulation'],
    recommendedModules: ['reading', 'listening', 'speaking'],
    description: 'The impact of natural and artificial blue spectrum illumination on human neuroendocrine circadian rhythms.'
  },
  {
    id: 'acad_23',
    title: 'Marine Biofouling & Non-Biocidal Hull Coatings',
    category: 'academic',
    domain: 'Marine Engineering & Chemistry',
    subtopics: ['Barnacle cyprid settlement adhesion', 'Silicone hydrogel foul-release matrices', 'Sharkskin denticle microtopography', 'Fuel consumption penalties from drag'],
    recommendedModules: ['reading', 'writing'],
    description: 'Developing eco-friendly surface micro-textures that prevent vessel barnacle accumulation without leaching toxic copper ions.'
  },
  {
    id: 'acad_24',
    title: 'Agrarian Revolutions in Medieval Northern Europe',
    category: 'academic',
    domain: 'Economic History',
    subtopics: ['Heavy wheeled moldboard plow adoption', 'Three-field crop rotation productivity', 'Horse collar harnessing biomechanics', 'Manorial open-field village governance'],
    recommendedModules: ['reading', 'writing'],
    description: 'Agricultural innovations between the 9th and 13th centuries that triggered European demographic expansion.'
  },
  {
    id: 'acad_25',
    title: 'Fiber-Optic Bandwidth Frontiers & Nonlinear Shannon Limit',
    category: 'academic',
    domain: 'Telecommunications Physics',
    subtopics: ['Kerr nonlinear phase shifts', 'Space-division multiplexing multicore fibers', 'Erbium-doped fiber amplifiers (EDFA)', 'Coherent optical digital signal processing'],
    recommendedModules: ['reading', 'writing'],
    description: 'Overcoming theoretical spectral efficiency boundaries in subsea intercontinental optical fiber telecommunication cables.'
  },
  {
    id: 'acad_26',
    title: 'Societal Risk Perception & Cognitive Bias in Hazards',
    category: 'academic',
    domain: 'Sociology & Risk Analysis',
    subtopics: ['Dread risk vs unknown risk taxonomy', 'Availability heuristic in media coverage', 'Social amplification of risk framework (SARF)', 'Trust asymmetry in regulatory agencies'],
    recommendedModules: ['reading', 'writing', 'speaking'],
    description: 'How public appraisal of technological and environmental dangers diverges systematically from actuarial probability assessments.'
  },
  {
    id: 'acad_27',
    title: 'Evolutionary Morphology of Cetacean Echolocation',
    category: 'academic',
    domain: 'Marine Zoology',
    subtopics: ['Phonic lips acoustic pulse generation', 'Melon acoustic impedance matching', 'Mandibular fat channel sound reception', 'High-frequency ultrasonic attenuation in water'],
    recommendedModules: ['reading', 'listening'],
    description: 'Anatomical transformations in toothed whales that enabled active acoustic imaging in turbid and abyssal seas.'
  },
  {
    id: 'acad_28',
    title: 'Stratospheric Aerosol Injection & Solar Geoengineering',
    category: 'academic',
    domain: 'Atmospheric Physics & Governance',
    subtopics: ['Sulfur dioxide photolytic conversion to sulfate', 'Volcanic analog eruptions (Mount Pinatubo)', 'Monsoon rainfall disruption risks', 'Termination shock governance dilemmas'],
    recommendedModules: ['reading', 'writing'],
    description: 'Scientific and diplomatic challenges surrounding proposed deliberate interventions in Earth’s solar radiation balance.'
  },
  {
    id: 'acad_29',
    title: 'Hydro-Engineering of Ancient Persian Qanat Systems',
    category: 'academic',
    domain: 'Civil Engineering History',
    subtopics: ['Subterranean gravitational gradient tunneling', 'Mother well aquifer tapping', 'Evaporation prevention in desert heat', 'Equitable rotational water allocation rights'],
    recommendedModules: ['reading', 'writing'],
    description: 'Ancient underground aqueduct technology that supported sustainable urban settlements across arid Iranian plateaus.'
  },
  {
    id: 'acad_30',
    title: 'Plant Neurobiology & Electrical Signal Transduction',
    category: 'academic',
    domain: 'Botany',
    subtopics: ['Phloem action potentials', 'Glutamate-like receptor signaling cascades', 'Systemic acquired resistance triggers', 'Volatile organic compound defense signaling'],
    recommendedModules: ['reading', 'listening'],
    description: 'Rapid systemic electrical and biochemical communication mechanisms coordinating whole-plant defense responses to herbivory.'
  },
  {
    id: 'acad_31',
    title: 'Ethnomusicology & Cross-Cultural Scale Tuning Systems',
    category: 'academic',
    domain: 'Musicology & Cultural Anthropology',
    subtopics: ['Just intonation vs equal temperament', 'Gamelan slendro and pelog tuning intervals', 'Acoustic resonance in sacred spaces', 'Oral transmission of raga microtonal ornaments'],
    recommendedModules: ['reading', 'listening', 'speaking'],
    description: 'Comparative analysis of musical temperament systems across diverse civilizations and acoustic philosophies.'
  },
  {
    id: 'acad_32',
    title: 'Space Debris Mitigation & Orbital Remediation Techniques',
    category: 'academic',
    domain: 'Aerospace Engineering',
    subtopics: ['Kessler syndrome collisional cascading', 'Active debris capture using electrodynamic tethers', 'Harpoon and net tether dynamics', 'Laser ablation atmospheric de-orbiting'],
    recommendedModules: ['reading', 'writing'],
    description: 'Engineering systems for tracking, capturing, and removing decommissioned satellites and rocket upper stages in Low Earth Orbit.'
  },
  {
    id: 'acad_33',
    title: 'Neurobiology of Dyslexia & Phonological Processing',
    category: 'academic',
    domain: 'Cognitive Science & Education',
    subtopics: ['Left-hemisphere temporoparietal hypofunction', 'Magnocellular visual deficit hypothesis', 'Phonemic awareness interventions', 'Multisensory orthographic training efficacy'],
    recommendedModules: ['reading', 'listening', 'speaking'],
    description: 'Brain imaging studies investigating neurological variations in reading fluency and evidence-based clinical pedagogy.'
  },
  {
    id: 'acad_34',
    title: 'Biogeochemistry of Peatland Carbon Sequestration',
    category: 'academic',
    domain: 'Ecosystem Science',
    subtopics: ['Sphagnum moss polyphenol enzyme inhibitors', 'Water-saturated anoxic decay suppression', 'Drainage and spontaneous peat fires', 'Rewetting restoration hydrological dynamics'],
    recommendedModules: ['reading', 'writing'],
    description: 'The disproportionate role of boreal and tropical peatlands in long-term terrestrial carbon storage and climate stability.'
  },
  {
    id: 'acad_35',
    title: 'Cognitive Ergonomics & Human-Autonomous Vehicle Interaction',
    category: 'academic',
    domain: 'Human Factors Engineering',
    subtopics: ['Out-of-the-loop performance deficits', 'Takeover transition latency under emergency events', 'Mode confusion in semi-automated systems', 'Trust calibration and overreliance hazards'],
    recommendedModules: ['reading', 'writing', 'speaking'],
    description: 'Human psychological constraints during critical control handoffs between automated driving software and human operators.'
  },

  // ==========================================
  // GENERAL TRAINING & WORKPLACE TOPICS (18 Topics)
  // ==========================================
  {
    id: 'gen_01',
    title: 'Modern Public Library Digital Transformation',
    category: 'general',
    domain: 'Community Services',
    subtopics: ['Digital literacy workshops for seniors', 'Makerspaces & 3D printing access', 'Interlibrary loan reservation protocols', 'E-book lending license management'],
    recommendedModules: ['reading', 'listening', 'speaking'],
    description: 'Evolution of municipal libraries into technology hubs, collaborative coworking centers, and media laboratories.'
  },
  {
    id: 'gen_02',
    title: 'Workplace Ergonomics & Remote Work Health',
    category: 'general',
    domain: 'Occupational Health',
    subtopics: ['Lumbar support and monitor height setup', 'Repetitive strain injury (RSI) prevention', 'Standing desk movement cycles', 'Eye strain 20-20-20 rule implementation'],
    recommendedModules: ['reading', 'writing', 'speaking'],
    description: 'Guidelines for configuring safe home workstations and preventing musculoskeletal disorders during desk work.'
  },
  {
    id: 'gen_03',
    title: 'Municipal E-Waste Disposal & Responsible Recycling',
    category: 'general',
    domain: 'Civic Environmental Policy',
    subtopics: ['Lithium-ion battery drop-off safety', 'Certified data wiping standards', 'Heavy metal leaching hazards', 'Appliance trade-in rebate initiatives'],
    recommendedModules: ['reading', 'listening', 'writing'],
    description: 'Local council procedures for safely disposing of outdated computers, smartphones, and household appliances.'
  },
  {
    id: 'gen_04',
    title: 'Public Transit Smart Card & Contactless Fare Integration',
    category: 'general',
    domain: 'Urban Transit',
    subtopics: ['Daily fare capping algorithms', 'Concession verification processes', 'Lost card balance protection', 'Inter-modal transfer validation rules'],
    recommendedModules: ['reading', 'listening'],
    description: 'How modern commuter rail and bus networks deploy seamless contactless payment systems and passenger user accounts.'
  },
  {
    id: 'gen_05',
    title: 'Community Garden Plot Allocation & Cooperative Management',
    category: 'general',
    domain: 'Community & Agriculture',
    subtopics: ['Water conservation drip systems', 'Organic pesticide guidelines', 'Composting rotation duties', 'Annual plot lottery criteria'],
    recommendedModules: ['reading', 'speaking'],
    description: 'Operational guidelines, volunteer responsibilities, and communal harvesting policies in municipal urban gardens.'
  },
  {
    id: 'gen_06',
    title: 'Hybrid Team Asynchronous Collaboration Best Practices',
    category: 'general',
    domain: 'Workplace Management',
    subtopics: ['Shared digital documentation norms', 'Time-zone overlap coordination', 'Minimizing unnecessary video conferences', 'Task sprint accountability trackers'],
    recommendedModules: ['reading', 'writing', 'speaking'],
    description: 'Strategies for managing distributed teams across multiple continents while maintaining alignment and work-life balance.'
  },
  {
    id: 'gen_07',
    title: 'Commuter Bicycle Infrastructure & Protected Cycleways',
    category: 'general',
    domain: 'Urban Mobility',
    subtopics: ['Bollard-separated bike lanes', 'Secure transit station bike lockers', 'Helmet and reflective gear safety mandates', 'E-bike speed classification rules'],
    recommendedModules: ['reading', 'writing', 'speaking'],
    description: 'City planning investments encouraging modal shift from private automobiles to active bicycle commuting.'
  },
  {
    id: 'gen_08',
    title: 'Consumer Rights in Cross-Border E-Commerce',
    category: 'general',
    domain: 'Consumer Law',
    subtopics: ['Statutory cooling-off return periods', 'Damaged goods liability apportionment', 'Import duty calculation transparency', 'Credit card chargeback dispute procedures'],
    recommendedModules: ['reading', 'writing'],
    description: 'Legal protections, warranty enforcement, and refund protocols for online shoppers purchasing goods from overseas merchants.'
  },
  {
    id: 'gen_09',
    title: 'Residential Energy Efficiency Grants & Thermal Upgrades',
    category: 'general',
    domain: 'Home & Energy',
    subtopics: ['Double glazing window subsidies', 'Attic cellulose insulation ratings', 'Heat pump installation rebates', 'Home energy performance certificates (EPC)'],
    recommendedModules: ['reading', 'writing', 'speaking'],
    description: 'Government programs assisting homeowners with the financial cost of retrofitting insulation and high-efficiency heating.'
  },
  {
    id: 'gen_10',
    title: 'Vocational Apprenticeship Frameworks & Dual Training',
    category: 'general',
    domain: 'Career & Education',
    subtopics: ['On-the-job competency benchmarks', 'Classroom theoretical hour requirements', 'Mentor evaluation check-ins', 'Industry recognized journeyman certification'],
    recommendedModules: ['reading', 'listening', 'writing'],
    description: 'The structure of paid industry apprenticeships combining practical technical workshop experience with formal credentials.'
  },
  {
    id: 'gen_11',
    title: 'Tenancy Agreements & Rental Property Rights',
    category: 'general',
    domain: 'Housing & Real Estate',
    subtopics: ['Security deposit protection schemes', 'Landlord notice periods for inspections', 'Emergency repair response obligations', 'Pet consent clause negotiations'],
    recommendedModules: ['reading', 'listening', 'speaking'],
    description: 'Standard contractual obligations between residential tenants and landlords under contemporary tenancy legislation.'
  },
  {
    id: 'gen_12',
    title: 'Community Disaster Preparedness & Volunteer Fire Services',
    category: 'general',
    domain: 'Public Safety',
    subtopics: ['Emergency evacuation route signage', 'Defensible space clearing around homes', 'Local siren alert siren drills', 'First aid volunteer roster coordination'],
    recommendedModules: ['reading', 'listening'],
    description: 'How regional communities organize volunteer emergency responder teams and household bushfire evacuation plans.'
  },
  {
    id: 'gen_13',
    title: 'Primary Health Clinic Appointment & Triage Systems',
    category: 'general',
    domain: 'Healthcare Access',
    subtopics: ['Nurse triage telephone prioritization', 'Online repeat prescription requests', 'Walk-in urgent care protocols', 'Preventative screening appointment reminders'],
    recommendedModules: ['reading', 'listening', 'speaking'],
    description: 'Navigating local family practice clinic operations, booking specialist referrals, and managing preventative care visits.'
  },
  {
    id: 'gen_14',
    title: 'Personal Financial Literacy & Household Budgeting',
    category: 'general',
    domain: 'Personal Finance',
    subtopics: ['Emergency fund liquidity targets', 'Credit score calculation factors', 'Retirement compound interest accounts', 'Variable expense tracking apps'],
    recommendedModules: ['reading', 'writing', 'speaking'],
    description: 'Core concepts in personal financial security, avoidance of high-interest predatory debt, and smart savings habits.'
  },
  {
    id: 'gen_15',
    title: 'Urban Tree Canopy Conservation & Street Tree Planting',
    category: 'general',
    domain: 'Municipal Forestry',
    subtopics: ['Drought-resistant native species selection', 'Root barrier sidewalk protection', 'Volunteer tree stewardship adoption programs', 'Canopy shade percentage targets'],
    recommendedModules: ['reading', 'writing', 'speaking'],
    description: 'Municipal forestry initiatives to plant and preserve mature deciduous trees for shade, air purification, and mental health.'
  },
  {
    id: 'gen_16',
    title: 'Small Business Incubators & Microfinance Programs',
    category: 'general',
    domain: 'Business & Entrepreneurship',
    subtopics: ['Seed capital grant applications', 'Pro bono legal consultation clinics', 'Coworking space lease terms', 'Pitch competition judging criteria'],
    recommendedModules: ['reading', 'writing', 'speaking'],
    description: 'Civic and university programs providing subsidized workspace, mentorship, and modest seed capital to local startups.'
  },
  {
    id: 'gen_17',
    title: 'Workplace Continuous Professional Development (CPD)',
    category: 'general',
    domain: 'Career Growth',
    subtopics: ['Annual CPD point requirements', 'Employer tuition reimbursement agreements', 'Internal cross-departmental job shadowing', 'Leadership seminar attendance validation'],
    recommendedModules: ['reading', 'listening', 'speaking'],
    description: 'How corporate and professional organizations structured ongoing education to keep employee skills aligned with market shifts.'
  },
  {
    id: 'gen_18',
    title: 'Food Packaging Waste Reduction & Bulk Stores',
    category: 'general',
    domain: 'Sustainable Living',
    subtopics: ['Tare weight jar discounting systems', 'Post-consumer recycled container sanitization', 'Shelf-life preservation of bulk dried goods', 'Deposit return schemes for glass bottles'],
    recommendedModules: ['reading', 'listening', 'speaking'],
    description: 'The operational models and consumer practices behind zero-waste grocery stores and reusable container supply chains.'
  },

  // ==========================================
  // DAILY LIFE, CULTURE & SOCIAL TOPICS (14 Topics)
  // ==========================================
  {
    id: 'daily_01',
    title: 'Traditional Culinary Heritage & Fermentation Crafts',
    category: 'daily_life',
    domain: 'Food Culture',
    subtopics: ['Sourdough wild yeast culture maintenance', 'Artisanal cheese aging cave humidity', 'Fermented vegetable probiotics', 'Generational recipe preservation initiatives'],
    recommendedModules: ['listening', 'speaking', 'writing'],
    description: 'The cultural significance and scientific resurgence of slow food preparation and traditional fermentation techniques.'
  },
  {
    id: 'daily_02',
    title: 'Grassroots Community Radio Stations',
    category: 'daily_life',
    domain: 'Media & Culture',
    subtopics: ['Volunteer radio host training', 'Multilingual immigrant hour broadcasts', 'Local unsigned musician showcases', 'Listener pledge drive funding models'],
    recommendedModules: ['listening', 'speaking'],
    description: 'How volunteer-operated FM and web radio stations provide hyper-local news and foster civic inclusion.'
  },
  {
    id: 'daily_03',
    title: 'Museum Digitization & High-Resolution Virtual Galleries',
    category: 'daily_life',
    domain: 'Arts & Heritage',
    subtopics: ['Gigapixel 3D scanning of sculptures', 'Open-access public domain art archives', 'Virtual reality museum walkthroughs', 'Preserving fragile historical manuscripts'],
    recommendedModules: ['reading', 'writing', 'speaking'],
    description: 'Efforts by world cultural institutions to digitize physical archives for universal academic and public accessibility.'
  },
  {
    id: 'daily_04',
    title: 'Music Therapy in Elderly Dementia Care',
    category: 'daily_life',
    domain: 'Health & Wellbeing',
    subtopics: ['Personalized nostalgic playlist curation', 'Rhythmic auditory stimulation for gait', 'Singing group emotional connectivity', 'Agitation reduction without pharmaceuticals'],
    recommendedModules: ['reading', 'listening', 'speaking'],
    description: 'Clinical deployment of familiar youth melodies to evoke memories, improve mood, and enhance communicative engagement.'
  },
  {
    id: 'daily_05',
    title: 'Sustainable Tourism & Community-Run Homestays',
    category: 'daily_life',
    domain: 'Travel & Tourism',
    subtopics: ['Local revenue retention vs foreign resort chains', 'Cultural etiquette briefing sessions', 'Carrying capacity limits on mountain trails', 'Leave-no-trace wilderness guidelines'],
    recommendedModules: ['reading', 'writing', 'speaking'],
    description: 'Ecotourism models that empower rural host villages while protecting vulnerable habitats from tourist overcrowding.'
  },
  {
    id: 'daily_06',
    title: 'The Resurgence of Analog Hobbies Among Young Adults',
    category: 'daily_life',
    domain: 'Lifestyle & Sociology',
    subtopics: ['Vinyl record collecting and listening salons', 'Film photography and darkroom chemistry', 'Manual mechanical watch restoration', 'Board game social cafes'],
    recommendedModules: ['listening', 'speaking'],
    description: 'Why younger generations are turning to tactile, screen-free recreation as a deliberate counterweight to digital fatigue.'
  },
  {
    id: 'daily_07',
    title: 'Textile Upcycling & Pre-Owned Garment Culture',
    category: 'daily_life',
    domain: 'Fashion & Sustainability',
    subtopics: ['Visible mending (Sashiko stitching)', 'Vintage clothes consignment curation', 'Garment swap party organization', 'Combating fast fashion landfill waste'],
    recommendedModules: ['speaking', 'writing'],
    description: 'The shift toward extending clothing lifespans through creative tailoring, repair workshops, and second-hand markets.'
  },
  {
    id: 'daily_08',
    title: 'Public Art Installations & Neighborhood Identity',
    category: 'daily_life',
    domain: 'Urban Culture',
    subtopics: ['Mural storytelling of neighborhood history', 'Interactive kinetic light sculptures', 'Community voting on civic art commissions', 'Vandalism prevention through youth involvement'],
    recommendedModules: ['listening', 'speaking'],
    description: 'How public murals, sculptures, and architectural light shows transform sterile urban spaces into vibrant community landmarks.'
  },
  {
    id: 'daily_09',
    title: 'Intergenerational Community Hubs & Shared Daycare',
    category: 'daily_life',
    domain: 'Social Innovation',
    subtopics: ['Co-locating preschools with senior centers', 'Storytelling and reading companion sessions', 'Mutual mental health and social benefits', 'Architectural safety considerations for both groups'],
    recommendedModules: ['reading', 'writing', 'speaking'],
    description: 'Social facilities that bring toddlers and elderly nursing home residents together for daily recreational activities.'
  },
  {
    id: 'daily_10',
    title: 'Time Banking & Neighborhood Skills Barter',
    category: 'daily_life',
    domain: 'Community Economics',
    subtopics: ['Equal value of one hour of service', 'Home repair for language tutoring trades', 'Elder companion transportation credits', 'Online neighborhood time-ledger software'],
    recommendedModules: ['listening', 'speaking'],
    description: 'Alternative economic networks where community members exchange useful skills and labor measured strictly in units of time.'
  },
  {
    id: 'daily_11',
    title: 'Household Water Conservation in Arid Municipalities',
    category: 'daily_life',
    domain: 'Environmental Living',
    subtopics: ['Greywater diversion for landscape irrigation', 'Xeriscaping with native drought-tolerant plants', 'Rainwater harvesting barrel filtration', 'Smart aerator fixture retrofitting'],
    recommendedModules: ['listening', 'writing', 'speaking'],
    description: 'Practical residential techniques for slashing household water consumption during prolonged summer drought periods.'
  },
  {
    id: 'daily_12',
    title: 'Traditional Indigenous Celestial Navigation',
    category: 'daily_life',
    domain: 'Cultural Knowledge',
    subtopics: ['Polynesian wayfinding star compasses', 'Wave swell refraction patterns', 'Seabird flight direction observation', 'Oral transmission of maritime chants'],
    recommendedModules: ['reading', 'listening'],
    description: 'Mastery of open-ocean canoe voyaging across thousands of nautical miles without magnetic compasses or instruments.'
  },
  {
    id: 'daily_13',
    title: 'Fair-Trade Specialty Coffee Culture & Micro-Roasters',
    category: 'daily_life',
    domain: 'Food & Global Trade',
    subtopics: ['Direct-trade pricing with smallholder farms', 'Single-origin elevation and bean processing', 'Cupping score evaluation standards', 'Shade-grown canopy biodiversity protection'],
    recommendedModules: ['listening', 'speaking', 'writing'],
    description: 'How consumer appreciation for artisanal specialty coffee is restructuring supply chain compensation for coffee farming families.'
  },
  {
    id: 'daily_14',
    title: 'Heirloom Seed Preservation & Seed Lending Libraries',
    category: 'daily_life',
    domain: 'Agriculture & Biodiversity',
    subtopics: ['Open-pollinated genetic diversity resilience', 'Borrow-and-return seed bank mechanics', 'Saving non-hybrid vegetable seeds', 'Climate-adapted regional crop landraces'],
    recommendedModules: ['reading', 'listening', 'speaking'],
    description: 'Civic seed banks safeguarding rare historical fruit and vegetable varieties against monoculture crop vulnerability.'
  }
];

export function getTopicById(id: string): TopicItem | undefined {
  return TOPIC_BANK.find((t) => t.id === id);
}

export function getRandomTopicByModule(module: 'reading' | 'listening' | 'writing' | 'speaking'): TopicItem {
  const eligible = TOPIC_BANK.filter((t) => t.recommendedModules.includes(module));
  if (eligible.length === 0) {
    return TOPIC_BANK[Math.floor(Math.random() * TOPIC_BANK.length)];
  }
  return eligible[Math.floor(Math.random() * eligible.length)];
}

export function getTopicsByCategory(category: 'academic' | 'general' | 'daily_life'): TopicItem[] {
  return TOPIC_BANK.filter((t) => t.category === category);
}
