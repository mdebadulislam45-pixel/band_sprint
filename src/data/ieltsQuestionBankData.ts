/**
 * BandSprint - Massive Practice Question Bank
 * Curated from IELTS volumes 11–21 and recent international examination pools.
 * Covers Writing Task 1, Writing Task 2, Speaking Parts 1-3, Reading, and Listening.
 */

import { EXPANDED_MODULE_QB_ITEMS } from './expandedModuleQuestionBank';

export interface QuestionBankItem {
  id: string;
  module:
    | 'Writing Task 1'
    | 'Writing Task 2'
    | 'Speaking Part 1'
    | 'Speaking Part 2'
    | 'Speaking Part 3'
    | 'Reading'
    | 'Listening';
  topic:
    | 'Education'
    | 'Technology'
    | 'Environment'
    | 'Society & Culture'
    | 'Economy & Work'
    | 'Health'
    | 'Urbanization';
  subType: string; // e.g. "Line Graph", "Agree / Disagree", "Cue Card", "True / False / Not Given", "Section 4 Lecture"
  frequency: 'High-Frequency' | 'Recent Real Exam' | 'Practice Standard';
  title: string;
  prompt: string;
  visualChartUrl?: string;
  cueCardBulletPoints?: string[];
  targetWordCount?: string;
  suggestedTimeMinutes: number;
  examinerTips: string[];
  keyVocabulary: { word: string; meaning_bn: string }[];
  modelAnswer: string;
  modelBand: string;
}

export const IELTS_QUESTION_BANK: QuestionBankItem[] = [
  // =========================================================================
  // WRITING TASK 2 (ESSAYS)
  // =========================================================================
  {
    id: 'qb_w2_1',
    module: 'Writing Task 2',
    topic: 'Technology',
    subType: 'Agree / Disagree',
    frequency: 'Recent Real Exam',
    title: 'Artificial Intelligence and Human Employment',
    prompt:
      'In the near future, artificial intelligence and automated robotics will replace a majority of human jobs across diverse sectors. To what extent do you agree or disagree with this prediction?',
    targetWordCount: '250–320 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Take a clear, unambiguous stance in the introduction and stick to it throughout.',
      'Distinguish between routine manual/cognitive tasks (easily automated) versus high-empathy/creative professions.',
      'Use hedging (e.g. "tends to automate", "is likely to augment rather than supplant").'
    ],
    keyVocabulary: [
      { word: 'Augment human labor', meaning_bn: 'মানুষের কর্মক্ষমতা বৃদ্ধি করা' },
      { word: 'Frictional unemployment', meaning_bn: 'প্রযুক্তিগত পরিবর্তনের মধ্যবর্তী বেকারত্ব' },
      { word: 'Cognitive automation', meaning_bn: 'বুদ্ধিবৃত্তিক কাজ স্বয়ংক্রিয়করণ' }
    ],
    modelAnswer:
      'The accelerating expansion of artificial intelligence has precipitated vigorous debate regarding the future viability of human employment. While some envision a dystopian landscape where robotic systems render human labor obsolete, I largely disagree with the proposition that most professions will disappear. Instead, technological innovation will transform rather than wholly eliminate the workforce.\n\nUndoubtedly, routine tasks involving repetitive manual execution or basic data analysis are prime candidates for complete automation. Financial auditing, administrative record management, and basic customer service will inevitably be handled by intelligent algorithms with superior speed and zero human fatigue. However, occupations requiring visceral empathy, high-stakes ethical discretion, and imaginative innovation remain inherently insulated. Surgeons, psychological therapists, and high-level strategists rely on emotional intelligence that cannot be duplicated by computational code.\n\nIn conclusion, rather than generating widespread permanent joblessness, artificial intelligence will act as an augmenting catalyst, fostering entirely new industries and shifting human labor toward higher-order creative problem solving.',
    modelBand: 'Band 8.5'
  },
  {
    id: 'qb_w2_2',
    module: 'Writing Task 2',
    topic: 'Environment',
    subType: 'Problem & Solution',
    frequency: 'High-Frequency',
    title: 'Urban Plastic Waste & Marine Degradation',
    prompt:
      'The proliferation of single-use plastic waste has created catastrophic pollution in oceans and cities worldwide. What are the primary causes of this phenomenon, and what actionable solutions can governments and citizens undertake?',
    targetWordCount: '250–300 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Devote Body Paragraph 1 to 2 distinct causes (e.g. consumer convenience culture and lack of recycling infrastructure).',
      'Devote Body Paragraph 2 directly to solutions corresponding to those causes (legislative bans, producer taxes, biodegradable innovation).'
    ],
    keyVocabulary: [
      { word: 'Biodegradable substitutes', meaning_bn: 'পরিবেশবান্ধব পচনশীল বিকল্প' },
      { word: 'Extended producer responsibility', meaning_bn: 'উৎপাদক প্রতিষ্ঠানের বর্জ্য ব্যবস্থাপনা দায়' },
      { word: 'Ubiquitous convenience', meaning_bn: 'সহজপ্রাপ্য সুবিধা ও সংস্কৃতি' }
    ],
    modelAnswer:
      'The pervasive proliferation of non-biodegradable single-use polymers represents one of the most pressing ecological crises of the contemporary era. This dilemma stems primarily from unrestrained commercial convenience and deficient waste-processing infrastructure; however, concerted legislative intervention and civic shifts can mitigate the catastrophe.\n\nThe principal cause of plastic proliferation is the entrenched preference for cheap, disposable packaging. Commercial corporations prioritize non-degradable petroleum polymers to maximize profit margins, while municipal disposal systems in developing metropolises lack advanced sorting technologies. Consequently, billions of metric tons of packaging end up in oceanic waterways, choking marine ecosystems.\n\nTo remediate this dilemma, governments must enforce statutory bans on non-essential single-use polymers and mandate Extended Producer Responsibility (EPR) taxes. Furthermore, public subsidies should be allocated toward bio-derived algae and mycelium packaging alternatives. In conclusion, combining legislative penalties with biodegradable material substitution is indispensable to safeguard global marine habitats.',
    modelBand: 'Band 8.5'
  },
  {
    id: 'qb_w2_3',
    module: 'Writing Task 2',
    topic: 'Education',
    subType: 'Discuss Both Views',
    frequency: 'Practice Standard',
    title: 'Standardized Testing vs Continuous Assessment',
    prompt:
      'Some educational theorists argue that formal standardized examinations are the most reliable metric for evaluating student performance, whereas others maintain that continuous coursework assessment is vastly superior. Discuss both views and give your opinion.',
    targetWordCount: '250–320 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Examine the objective fairness and comparability of exams in Body 1.',
      'Examine the reduction in examination stress and deeper learning of coursework in Body 2.',
      'State your balanced personal stance in the introduction, body, and conclusion.'
    ],
    keyVocabulary: [
      { word: 'Standardized assessment', meaning_bn: 'মানসম্মত অভিন্ন পরীক্ষা' },
      { word: 'Continuous coursework', meaning_bn: 'ধারাবাহিক ক্লাস মূল্যায়ন ও অ্যাসাইনমেন্ট' },
      { word: 'Pedagogical validity', meaning_bn: 'শিক্ষাদানের বৈজ্ঞানিক যথার্থতা' }
    ],
    modelAnswer:
      'The optimal methodology for assessing academic competence remains a subject of contentious pedagogical deliberation. While proponents of standardized examinations champion their objectivity and administrative efficiency, advocates of continuous coursework argue that ongoing evaluation provides a more holistic reflection of intellectual capability. This essay discusses both perspectives before arguing that a hybrid framework constitutes the ideal approach.\n\nOn the one hand, standardized examinations provide an impartial, uniform benchmark that mitigates subjective instructor bias. Under controlled examination conditions, every student confronts identical challenges within a strictly timed environment, allowing university admissions boards to compare candidates from disparate educational backgrounds with statistical equity.\n\nOn the other hand, high-stakes formal examinations often evaluate superficial rote memorization rather than deep analytical insight, frequently inducing debilitating test anxiety. Continuous assessment, by contrast, nurtures sustained research acumen, collaborative teamwork, and creative revision over months. In conclusion, an enlightened educational system should synthesize both paradigms: employing coursework for formative skill development while utilizing periodic exams to confirm individual mastery.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_w2_4',
    module: 'Writing Task 2',
    topic: 'Economy & Work',
    subType: 'Advantages & Disadvantages',
    frequency: 'Recent Real Exam',
    title: 'The Four-Day Workweek & Economic Productivity',
    prompt:
      'An increasing number of multinational corporations and national governments are trialing a shortened four-day workweek without reducing employee salaries. Do the advantages of this policy outweigh the disadvantages?',
    targetWordCount: '260–310 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Weigh operational costs for 24/7 service industries against cognitive productivity gains.',
      'Ensure your comparative judgement ("outweigh") is explicit in both the thesis and conclusion.'
    ],
    keyVocabulary: [
      { word: 'Cognitive burnout', meaning_bn: 'মানসিক ক্লান্তি ও অবসাদ' },
      { word: 'Marginal productivity', meaning_bn: 'প্রান্তিক উৎপাদনশীলতা' },
      { word: 'Work-life equilibrium', meaning_bn: 'কর্ম ও ব্যক্তিগত জীবনের ভারসাম্য' }
    ],
    modelAnswer:
      'The conventional forty-hour, five-day workweek—an industrial relic of the twentieth century—is increasingly being challenged by enterprises experimenting with a condensed four-day schedule at full remuneration. Although this transition imposes logistical complexities on customer-facing sectors, I firmly contend that the psychological and economic dividends far eclipse the drawbacks.\n\nAdmittedly, compressing working hours can strain industries reliant on continuous physical presence, such as emergency healthcare, logistics, and hospitality. Employers in these domains may incur elevated payroll expenses to hire supplemental shift personnel. Nevertheless, in knowledge-based economies, prolonged office attendance rarely correlates with superior output. Empirical trials conducted in Iceland and the United Kingdom demonstrate that reducing weekly hours eradicates chronic cognitive burnout, slashes absenteeism, and sharpens employee focus during active shifts.\n\nFurthermore, an additional day of leisure stimulates domestic consumption and enables parents to invest quality time in family caregiving and civic engagement. In conclusion, the advantages of a four-day workweek decisively outweigh its transitional hurdles, heralding a more sustainable and humane economic paradigm.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_w2_5',
    module: 'Writing Task 2',
    topic: 'Health',
    subType: 'Agree / Disagree',
    frequency: 'High-Frequency',
    title: 'Sugar Taxes & Public Health Legislation',
    prompt:
      'Some public health experts argue that governments should impose heavy taxes on sugary beverages and ultra-processed fast foods to combat rising obesity rates. Others claim that dietary choices are a matter of personal responsibility. To what extent do you agree or disagree?',
    targetWordCount: '250–310 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Address the libertarian argument of consumer autonomy before explaining why fiscal intervention is justified.',
      'Connect individual obesity to collective taxpayer healthcare burdens.'
    ],
    keyVocabulary: [
      { word: 'Fiscal disincentive', meaning_bn: 'আর্থিক নিরুৎসাহকরণ বা করের চাপ' },
      { word: 'Metabolic syndrome', meaning_bn: 'বিপাকীয়জনিত দীর্ঘমেয়াদী রোগ' },
      { word: 'Preventive epidemiology', meaning_bn: 'রোগ প্রতিরোধমূলক জনস্বাস্থ্য বিজ্ঞান' }
    ],
    modelAnswer:
      'The global escalation of metabolic disorders and childhood obesity has prompted fierce debate over whether states should levy punitive excise duties on ultra-processed, high-sugar commodities. While critics characterize such fiscal measures as paternalistic intrusions into individual liberty, I strongly agree that sugar taxation is an indispensable public health instrument.\n\nOpponents of sin taxes contend that adults possess the autonomy to regulate their own caloric intake and that regressive food duties disproportionately penalize low-income households. However, this perspective ignores the asymmetric marketing power of multinational food conglomerates, which engineer hyper-palatable products specifically to trigger neurological cravings. Moreover, diet-related chronic illnesses—such as Type 2 diabetes and cardiovascular disease—impose billions of dollars in preventable expenditure upon taxpayer-funded national healthcare systems.\n\nBy elevating the retail price of sweetened beverages, governments create an immediate fiscal disincentive that nudges consumers toward healthier hydration while compelling manufacturers to reformulate their recipes. When revenues from these levies are ring-fenced to subsidize fresh produce in underprivileged schools, the policy becomes doubly transformative. In conclusion, targeted taxation on ultra-processed foods is both ethically justifiable and economically imperative.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_w2_6',
    module: 'Writing Task 2',
    topic: 'Urbanization',
    subType: 'Problem & Solution',
    frequency: 'Practice Standard',
    title: 'Megacity Housing Affordability & Urban Sprawl',
    prompt:
      'In many major metropolitan areas around the world, housing has become unaffordable for young professionals and essential workers. Why is this happening, and what measures can governments take to resolve the housing crisis?',
    targetWordCount: '260–320 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Analyze both supply-side constraints (zoning laws) and demand-side speculation (institutional investors).',
      'Propose concrete urban planning solutions: high-density transit-oriented development and social housing quotas.'
    ],
    keyVocabulary: [
      { word: 'Speculative real estate', meaning_bn: 'অতি-মুনাফার আশায় আবাসন খাতে বিনিয়োগ' },
      { word: 'Transit-oriented development', meaning_bn: 'গণপরিবহনকেন্দ্রিক পরিকল্পিত নগরায়ণ' },
      { word: 'Gentrification', meaning_bn: 'নগর সংস্কারের ফলে নিম্নবিত্তদের স্থানচ্যুতি' }
    ],
    modelAnswer:
      'Across contemporary global metropolises, escalating property valuations and rental tariffs have priced young graduates and essential municipal workers out of urban centers. This acute affordability crisis is driven by speculative investment and restrictive zoning laws, yet it can be ameliorated through decisive regulatory and infrastructural reforms.\n\nTwo primary catalysts underpin the housing shortage. Firstly, residential real estate has been financialized into a global asset class; institutional hedge funds acquire vast portfolios of urban apartments, leaving many units vacant as speculative stores of wealth. Secondly, antiquated municipal zoning regulations frequently prohibit high-density vertical construction, artificially strangling housing supply while rural-to-urban migration surges.\n\nTo rectify this imbalance, municipal authorities must overhaul archaic planning codes to permit mixed-use, high-density residential towers adjacent to mass-transit corridors. Concurrently, governments should levy punitive vacancy taxes on unoccupied investment properties and mandate that private developers allocate at least thirty percent of new residential floor space to rent-controlled social housing. In conclusion, pairing zoning deregulation with anti-speculation taxation is vital to restore equitable urban living.',
    modelBand: 'Band 8.5'
  },
  {
    id: 'qb_w2_7',
    module: 'Writing Task 2',
    topic: 'Society & Culture',
    subType: 'Discuss Both Views',
    frequency: 'Recent Real Exam',
    title: 'Preservation of Endangered Indigenous Languages',
    prompt:
      'Several languages are dying out every year as global communication converges around a few dominant tongues. Some people think this is a positive evolutionary step because having fewer languages makes life easier, while others argue that losing languages destroys cultural diversity. Discuss both views and give your opinion.',
    targetWordCount: '260–320 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Acknowledge the pragmatic efficiency of a global lingua franca in aviation, science, and trade.',
      'Counterbalance with the irreplaceable loss of indigenous ecological knowledge and identity when a language dies.'
    ],
    keyVocabulary: [
      { word: 'Lingua franca', meaning_bn: 'ভিন্ন ভাষাভাষীদের মধ্যে যোগাযোগের সাধারণ ভাষা' },
      { word: 'Intangible cultural heritage', meaning_bn: 'অধরা সাংস্কৃতিক ও বুদ্ধিবৃত্তিক ঐতিহ্য' },
      { word: 'Linguistic imperialism', meaning_bn: 'প্রভাবশালী ভাষার একচ্ছত্র আধিপত্য' }
    ],
    modelAnswer:
      'The accelerating extinction of minority languages is one of the defining sociolinguistic phenomena of the twenty-first century. While pragmatists welcome linguistic convergence as a catalyst for frictionless global commerce, cultural anthropologists warn that language death represents an irreversible intellectual tragedy. This essay examines both viewpoints before contending that endangered languages must be actively safeguarded.\n\nAdmittedly, the consolidation of human communication around a handful of global lingua francas yields undeniable economic and diplomatic efficiencies. When scientists, aviators, and multinational entrepreneurs share a common linguistic medium, translation overheads vanish and cross-border collaboration accelerates. From a purely utilitarian perspective, linguistic uniformity fosters international integration.\n\nHowever, a language is far more than a neutral code for exchanging commercial data; it is the vessel of a community’s intangible cultural heritage, oral folklore, and philosophical worldview. Indigenous tongues frequently encode centuries of botanical, medicinal, and ecological wisdom that lacks equivalents in dominant languages. Allowing these idioms to vanish impoverishes human cognitive diversity. In conclusion, while mastering a global lingua franca is practically advantageous, states should fund bilingual education and digital archives to preserve ancestral languages.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_w2_8',
    module: 'Writing Task 2',
    topic: 'Technology',
    subType: 'Double Question',
    frequency: 'Recent Real Exam',
    title: 'Algorithmic Social Media & Youth Attention Spans',
    prompt:
      'Young people today spend several hours daily consuming short-form video content on social media platforms. How does this habit affect their cognitive development and social interactions? What steps can parents and schools take to address this trend?',
    targetWordCount: '260–320 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Ensure both questions receive equal analytical weight (Body 1: Cognitive & Social Impacts; Body 2: Parental & Educational Interventions).',
      'Use neurocognitive vocabulary such as "dopaminergic feedback loops" and "sustained deep reading".'
    ],
    keyVocabulary: [
      { word: 'Dopaminergic feedback loop', meaning_bn: 'মস্তিষ্কে তাৎক্ষণিক আনন্দের আসক্তিকর চক্র' },
      { word: 'Fragmented attention span', meaning_bn: 'বিচ্ছিন্ন ও ক্ষণস্থায়ী মনোযোগ' },
      { word: 'Digital hygiene', meaning_bn: 'প্রযুক্তি ব্যবহারের স্বাস্থ্যকর নিয়মাবলি' }
    ],
    modelAnswer:
      'The ubiquity of algorithmically curated short-form video platforms has fundamentally rewired how modern adolescents allocate their leisure time. This habit severely fragments cognitive endurance and erodes face-to-face empathy, necessitating coordinated intervention from both households and educational institutions.\n\nRegarding developmental impacts, rapid-fire video feeds exploit dopaminergic reward pathways in the developing prefrontal cortex. Accustomed to instantaneous visual novelty every fifteen seconds, students increasingly struggle with sustained deep reading and complex analytical problem-solving. Socially, virtual parasocial interactions supplant authentic community engagement, fostering superficial validation-seeking and heightened social anxiety during unscripted real-world conversations.\n\nTo counteract this trajectory, parents must establish non-negotiable digital hygiene boundaries, such as prohibiting smartphones in bedrooms after dusk and modeling screen-free family dining. Simultaneously, secondary schools should enforce phone-free classroom environments while integrating media literacy modules that expose how persuasive algorithms monetize human attention. In conclusion, curbing algorithmic screen addiction requires proactive domestic boundaries paired with institutional reform.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_w2_9',
    module: 'Writing Task 2',
    topic: 'Environment',
    subType: 'Discuss Both Views',
    frequency: 'High-Frequency',
    title: 'Space Exploration vs Terrestrial Climate Funding',
    prompt:
      'Some people argue that governments and private billionaires are wasting billions of dollars on space exploration when that money should be spent solving climate change and poverty on Earth. Others believe space research is essential for humanity’s future. Discuss both views and give your opinion.',
    targetWordCount: '260–320 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Avoid treating space exploration and Earth conservation as a zero-sum game.',
      'Cite concrete satellite spin-offs (meteorological telemetry, solar photovoltaics, water purification).'
    ],
    keyVocabulary: [
      { word: 'Technological spin-offs', meaning_bn: 'মহাকাশ গবেষণার উপজাত প্রযুক্তিগত উদ্ভাবন' },
      { word: 'Fiscal prioritization', meaning_bn: 'রাষ্ট্রীয় বাজেটের অগ্রাধিকার নির্ধারণ' },
      { word: 'Orbital telemetry', meaning_bn: 'কৃত্রিম উপগ্রহের মাধ্যমে পৃথিবীর তথ্য পর্যবেক্ষণ' }
    ],
    modelAnswer:
      'The allocation of vast capital reserves toward extraterrestrial exploration amidst acute terrestrial crises frequently sparks ethical controversy. While critics condemn aerospace expenditure as an indulgence that neglects domestic poverty and ecological collapse, proponents contend that space science generates indispensable technological breakthroughs. I believe both endeavors are mutually reinforcing rather than mutually exclusive.\n\nThose who oppose cosmic expenditure point to the immediate humanitarian imperatives on Earth. Billions of citizens lack potable water, resilient agricultural infrastructure, and basic healthcare. From this vantage point, financing lunar bases or Martian rovers appears morally indefensible when redirecting those funds could accelerate reforestation and poverty alleviation.\n\nConversely, viewing aerospace budgets as money blasted into a vacuum is scientifically shortsighted. Orbital satellite telemetry provides the very empirical data—tracking polar ice retreat, methane plumes, and ocean acidification—that climate scientists rely upon to model global warming. Furthermore, aerospace research has yielded vital spin-off innovations, including high-efficiency solar cells and closed-loop water filtration. In conclusion, rather than halting cosmic inquiry, governments should maintain balanced investment in space science as an engine for terrestrial sustainability.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_w2_10',
    module: 'Writing Task 2',
    topic: 'Education',
    subType: 'Agree / Disagree',
    frequency: 'Practice Standard',
    title: 'Financial Literacy & Practical Life Skills in Schools',
    prompt:
      'Many high school graduates leave school without knowing how to manage personal finances, file taxes, or prepare nutritious meals. Some people believe schools should replace traditional theoretical subjects like ancient history or calculus with practical life skills. To what extent do you agree or disagree?',
    targetWordCount: '250–310 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Notice the extreme word "replace" in the prompt—argue for integrating life skills WITHOUT abolishing core academic disciplines.',
      'Explain why theoretical subjects remain vital for critical thinking.'
    ],
    keyVocabulary: [
      { word: 'Fiscal literacy', meaning_bn: 'আর্থিক ব্যবস্থাপনা ও বাজেট জ্ঞান' },
      { word: 'Holistic curriculum', meaning_bn: 'সমন্বিত ও পূর্ণাঙ্গ শিক্ষাক্রম' },
      { word: 'Intellectual rigor', meaning_bn: 'বুদ্ধিবৃত্তিক গভীরতা ও যৌক্তিক সক্ষমতা' }
    ],
    modelAnswer:
      'It is frequently observed that secondary school leavers enter adulthood ill-equipped to navigate everyday fiscal and domestic responsibilities. While I wholeheartedly agree that practical life competencies warrant inclusion in secondary curricula, I strongly disagree that they should supplant foundational academic disciplines such as history or mathematics.\n\nAdvocates of pragmatic reform rightly highlight that financial illiteracy—manifested in predatory credit card debt and poor nutritional habits—undermines adult well-being. Introducing modular workshops on compound interest, taxation, and culinary hygiene can empower adolescents with immediate self-reliance.\n\nHowever, dismantling theoretical scholarship to accommodate domestic training would be a grave pedagogical error. Studying history inoculates citizens against political demagoguery by cultivating source verification and historical empathy, while advanced mathematics trains abstract logical deduction essential for engineering and computer science. A secondary school is not merely a vocational survival camp; it is the crucible of intellectual maturation. In conclusion, educational authorities should integrate practical life-skills seminars alongside, rather than at the expense of, rigorous academic subjects.',
    modelBand: 'Band 8.5'
  },

  // =========================================================================
  // WRITING TASK 1 (ACADEMIC CHARTS, MAPS, PROCESSES & GT LETTERS)
  // =========================================================================
  {
    id: 'qb_w1_1',
    module: 'Writing Task 1',
    topic: 'Economy & Work',
    subType: 'Line Graph',
    frequency: 'Practice Standard',
    title: 'Renewable Electricity Generation by Source (2000–2025)',
    prompt:
      'The line graph shows electricity generated from solar, wind, and hydroelectric sources in a European nation between 2000 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    targetWordCount: '150–200 words',
    suggestedTimeMinutes: 20,
    examinerTips: [
      'Always write a clear Overview paragraph highlighting the overall trajectory of all sources.',
      'Group data by similar trends (e.g. rapid exponential growth of wind/solar versus plateauing of hydro).',
      'Use accurate trend prepositions: "rose to 45 GW", "increased by 20 percentage points", "stood at 10 GW".'
    ],
    keyVocabulary: [
      { word: 'Exponential surge', meaning_bn: 'দ্রুত ও বহুগুণ বৃদ্ধি' },
      { word: 'Plateaued at', meaning_bn: 'নির্দিষ্ট মাত্রায় পৌঁছে স্থির হওয়া' },
      { word: 'Overtook', meaning_bn: 'পেছনে ফেলে এগিয়ে যাওয়া' }
    ],
    modelAnswer:
      'The line graph illustrates the volume of electric power generated from three distinct renewable sources—namely solar, wind, and hydroelectricity—in a specified European country from 2000 to 2025. Units are quantified in gigawatt-hours (GWh).\n\nOverall, it is readily apparent that while wind and solar energy experienced dramatic upward trajectories over the quarter-century, hydroelectric output exhibited modest initial growth before plateauing.\n\nIn 2000, hydroelectricity was the undisputed leader, producing 120 GWh, while wind and solar contributed negligible outputs below 15 GWh each. Hydroelectric generation rose moderately to peak at roughly 145 GWh in 2012, after which it fluctuated marginally around that threshold for the remainder of the timeline.\n\nBy contrast, wind power witnessed an accelerated surge, overtaking hydroelectricity around 2017 to culminate at a dominant 260 GWh by 2025. Solar electricity followed a comparable upward pattern, climbing steeply from 2010 onward to reach approximately 180 GWh, firmly establishing itself as the second-largest clean energy contributor.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_w1_2',
    module: 'Writing Task 1',
    topic: 'Urbanization',
    subType: 'Map Comparison',
    frequency: 'Recent Real Exam',
    title: 'Redevelopment of Port Town (1995 vs Present)',
    prompt:
      'The two maps show the transformation of a coastal industrial harbor town between 1995 and the present day. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    targetWordCount: '150–190 words',
    suggestedTimeMinutes: 20,
    examinerTips: [
      'In the overview, state the overarching transformation: e.g. industrial cargo dockland transformed into a modern commercial and pedestrian leisure precinct.',
      'Use spatial prepositions: "in the north-western quadrant", "adjacent to the shoreline", "converted into", "demolished to make way for".'
    ],
    keyVocabulary: [
      { word: 'Pedestrianized promenade', meaning_bn: 'শুধু পথচারীদের হাঁটার জন্য নির্ধারিত রাস্তা' },
      { word: 'Repurposed into', meaning_bn: 'পুনরায় অন্য কাজে রূপান্তর করা' },
      { word: 'Demolished to make way for', meaning_bn: 'ভেঙে ফেলে নতুন কিছুর জন্য জায়গা তৈরি করা' }
    ],
    modelAnswer:
      'The two maps delineate the urban and commercial redevelopment of an industrial coastal harbor between 1995 and the present day.\n\nOverall, the town has transitioned from a utilitarian industrial dockland characterized by warehouses and cargo freight into a recreational, tourism-oriented waterfront hub with expanded residential and retail amenities.\n\nIn 1995, the northern perimeter of the port was dominated by commercial fish warehouses and a dock crane depot. These structures have since been demolished to facilitate the construction of luxury multi-story residential apartments and an open-air retail promenade. The former cargo railway track that ran parallel to the pier has been dismantled, and a pedestrianized boulevard lined with cafes has replaced it.\n\nTo the south-west, the disused shipyard has been repurposed into a recreational marina with docking berths for private yachts. Additionally, a new public ferry terminal and public parking facility were constructed at the eastern harbor entrance, considerably enhancing visitor accessibility.',
    modelBand: 'Band 8.5'
  },
  {
    id: 'qb_w1_3',
    module: 'Writing Task 1',
    topic: 'Environment',
    subType: 'Process Diagram',
    frequency: 'High-Frequency',
    title: 'Industrial Seawater Desalination & Reverse Osmosis',
    prompt:
      'The diagram below illustrates the sequential stages involved in producing potable drinking water from marine seawater at a modern reverse-osmosis desalination facility. Summarise the information by selecting and reporting the main features.',
    targetWordCount: '160–195 words',
    suggestedTimeMinutes: 20,
    examinerTips: [
      'Use passive voice verbs in the present simple tense ("is drawn through", "are filtered out", "is subjected to").',
      'Use sequential discourse markers ("Initially", "Subsequently", "At the pressurized membrane stage", "Finally").'
    ],
    keyVocabulary: [
      { word: 'Semi-permeable membrane', meaning_bn: 'অর্ধভেদ্য ঝিল্লি বা ছাঁকনি' },
      { word: 'Potable water', meaning_bn: 'পানযোগ্য বিশুদ্ধ পানি' },
      { word: 'Concentrated brine', meaning_bn: 'অতি-ঘন লবণাক্ত বর্জ্য পানি' }
    ],
    modelAnswer:
      'The process diagram depicts the multi-stage engineering procedure by which saline ocean water is purified into potable municipal drinking water via reverse osmosis.\n\nOverall, the linear process comprises four principal phases: offshore intake screening, multi-media pretreatment filtration, high-pressure membrane separation, and post-treatment remineralization prior to distribution.\n\nInitially, raw seawater is drawn through a submerged offshore intake pipeline equipped with coarse mesh screens that exclude marine fauna and large debris. The water is subsequently pumped into a pretreatment chamber where coagulation agents and sand filters strip away suspended particulate matter, microscopic algae, and silt.\n\nIn the core third stage, high-pressure pumps force the clarified saltwater through cylindrical semi-permeable reverse-osmosis membranes. These microscopic pores permit pure water molecules to pass while rejecting dissolved sodium chloride and minerals. The rejected concentrated brine is safely diffused back into the seabed, whereas the freshwater permeate undergoes calcium remineralization and chlorine disinfection before entering the municipal storage reservoir.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_w1_4',
    module: 'Writing Task 1',
    topic: 'Society & Culture',
    subType: 'Bar Chart',
    frequency: 'Practice Standard',
    title: 'Household Expenditure Categories Across Three Countries (2024)',
    prompt:
      'The bar chart compares the average percentage of household income spent on five major expenditure categories (Housing, Food, Transport, Healthcare, and Leisure) in the United Kingdom, Japan, and Brazil in 2024. Summarise the information by selecting and reporting the main features.',
    targetWordCount: '160–200 words',
    suggestedTimeMinutes: 20,
    examinerTips: [
      'Compare across categories and across nations rather than listing each country in isolation.',
      'Highlight the highest and lowest proportions in your Overview paragraph.'
    ],
    keyVocabulary: [
      { word: 'Accounted for the lion’s share', meaning_bn: 'সিংহভাগ অংশ দখল করেছিল' },
      { word: 'Discretionary income', meaning_bn: 'প্রয়োজনীয় ব্যয়ের পর উদ্বৃত্ত আয়' },
      { word: 'Disproportionate allocation', meaning_bn: 'অসামঞ্জস্যপূর্ণ ব্যয় বরাদ্দ' }
    ],
    modelAnswer:
      'The bar chart illustrates how average households in the United Kingdom, Japan, and Brazil distributed their budgets across five core expenditure sectors in 2024.\n\nOverall, housing and food constituted the two largest financial commitments across all three nations, whereas healthcare consistently absorbed the smallest share of domestic budgets.\n\nIn the United Kingdom and Japan, accommodation accounted for the lion’s share of household outgoings, standing at 34% and 31% respectively, compared to a more moderate 22% in Brazil. Conversely, Brazilian families dedicated the highest proportion of their income to groceries and food at 29%, nearly double the British allocation of 15% and noticeably above Japan’s 20%.\n\nRegarding remaining categories, transport expenditure was relatively uniform across all three countries, hovering between 14% and 17%. Leisure spending was substantially higher in the UK (19%) and Japan (18%) than in Brazil (10%), while out-of-pocket healthcare costs remained below 9% in all surveyed nations.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_w1_5',
    module: 'Writing Task 1',
    topic: 'Education',
    subType: 'Pie Chart & Table (Mixed)',
    frequency: 'Recent Real Exam',
    title: 'Postgraduate Destinations & Starting Salaries by Faculty',
    prompt:
      'The pie chart shows the career destinations of postgraduate students from a British university 12 months after graduation, while the accompanying table displays median starting salaries across four academic faculties. Summarise the information and make comparisons where relevant.',
    targetWordCount: '165–200 words',
    suggestedTimeMinutes: 20,
    examinerTips: [
      'For mixed charts, dedicate Body Paragraph 1 to the pie chart and Body Paragraph 2 to the table.',
      'Synthesize the main finding from both visuals in your Overview.'
    ],
    keyVocabulary: [
      { word: 'Remuneration', meaning_bn: 'পারিশ্রমিক বা বেতন কাঠামো' },
      { word: 'Full-time employment', meaning_bn: 'পূর্ণকালীন পেশাগত চাকরি' },
      { word: 'Doctoral research', meaning_bn: 'পিএইচডি বা উচ্চতর গবেষণা' }
    ],
    modelAnswer:
      'The pie chart delineates the employment pathways of master’s graduates from a UK university one year after completing their degrees, while the table compares median initial salaries across four faculties.\n\nOverall, the vast majority of postgraduates transitioned directly into full-time employment, and graduates from STEM and business disciplines commanded markedly higher starting remuneration than those in the arts.\n\nAccording to the pie chart, 64% of alumni secured full-time corporate or public-sector roles within twelve months. A further 18% pursued funded doctoral research, whereas 11% combined part-time work with further study, leaving only 7% unemployed.\n\nTurning to the salary table, Computer Science & AI graduates earned the highest median starting salary at £52,000 per annum, closely followed by Finance & Economics at £48,500. Clinical Life Sciences postgraduates entered the workforce at a moderate median of £36,000, whereas Creative Arts & Humanities alumni recorded the lowest initial earnings at £27,500.',
    modelBand: 'Band 8.5'
  },
  {
    id: 'qb_w1_6',
    module: 'Writing Task 1',
    topic: 'Economy & Work',
    subType: 'General Training Formal Letter',
    frequency: 'Practice Standard',
    title: 'Formal Proposal Letter for Professional Training Workshop',
    prompt:
      'You recently attended an international professional conference that was highly relevant to your department. Write a letter to your company director. In your letter:\n- explain what the conference was about\n- describe which session was most useful to your role\n- suggest how you can share what you learned with your colleagues.',
    targetWordCount: '150–190 words',
    suggestedTimeMinutes: 20,
    examinerTips: [
      'Use a formal salutation ("Dear Ms. Sterling,") and sign-off ("Yours sincerely,").',
      'Cover each of the three bullet points in its own crisp, logical paragraph.'
    ],
    keyVocabulary: [
      { word: 'Actionable insights', meaning_bn: 'বাস্তব কাজে প্রয়োগযোগ্য ধারণা' },
      { word: 'Cross-departmental seminar', meaning_bn: 'আন্তঃবিভাগীয় প্রশিক্ষণ সেমিনার' },
      { word: 'Operational efficiency', meaning_bn: 'দাপ্তরিক কাজের গতিশীলতা ও দক্ষতা' }
    ],
    modelAnswer:
      'Dear Mr. Henderson,\n\nI am writing to express my gratitude for the company’s sponsorship of my attendance at the European Supply Chain & Logistics Summit held in Manchester last week, and to outline how our division can capitalize on the insights gained.\n\nThe three-day conference centered on predictive inventory analytics and sustainable freight routing. Of particular relevance to my role as Senior Procurement Coordinator was the keynote workshop led by Dr. Clara Vance on automated warehouse demand forecasting. Her case studies demonstrated how mid-sized distributors reduced seasonal overstocking costs by 22% using open-source forecasting models.\n\nTo ensure our entire operations team benefits from these methodologies, I would like to propose hosting a ninety-minute interactive training seminar next Wednesday afternoon. I have already compiled a concise slide deck and practical template sheets that our regional buyers can immediately apply to our third-quarter procurement cycle.\n\nThank you once again for supporting my professional development.\n\nYours sincerely,\nTariq Mahmud',
    modelBand: 'Band 9.0'
  },

  // =========================================================================
  // SPEAKING PART 1 (INTERVIEW QUESTIONS)
  // =========================================================================
  {
    id: 'qb_spk1_1',
    module: 'Speaking Part 1',
    topic: 'Urbanization',
    subType: 'Part 1 Interview',
    frequency: 'High-Frequency',
    title: 'Hometown, Architecture & Public Spaces',
    prompt:
      '1. What do you like most about the architecture or layout of your hometown?\n2. Has your hometown changed significantly over the past decade?\n3. What kind of public spaces do young people in your city enjoy visiting?',
    suggestedTimeMinutes: 4,
    examinerTips: [
      'Give 2–3 natural sentences per question: direct answer + specific reason/example.',
      'Avoid memorized lists; use descriptive adjectives ("juxtaposition of colonial heritage and modern high-rises").'
    ],
    keyVocabulary: [
      { word: 'Architectural juxtaposition', meaning_bn: 'ভিন্নধর্মী স্থাপত্যশৈলীর সহাবস্থান' },
      { word: 'Pedestrian-friendly', meaning_bn: 'পথচারীদের হাঁটার উপযোগী' },
      { word: 'Vertical urbanization', meaning_bn: 'বহুতল ভবনকেন্দ্রিক নগরায়ণ' }
    ],
    modelAnswer:
      '1. What captivates me most about my hometown is its striking architectural juxtaposition. In the historic southern quarter, you can stroll past centuries-old terracotta mosques and colonial courtyards, whereas the northern commercial district bristles with sleek glass skyscrapers.\n\n2. Immensely so. Over the past ten years, the city has undergone rapid vertical urbanization. An elevated metro rail line now bisects the main arterial avenue, which has dramatically alleviated rush-hour gridlock.\n\n3. Young professionals and university students typically gravitate toward lakeside pedestrian promenades and rooftop artisan cafes, where they can unwind with acoustic music away from vehicular noise.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_spk1_2',
    module: 'Speaking Part 1',
    topic: 'Technology',
    subType: 'Part 1 Interview',
    frequency: 'Recent Real Exam',
    title: 'Digital Habits, Apps & Online Communication',
    prompt:
      '1. Which mobile application do you use most constructively in your daily routine?\n2. Do you prefer voice calls or text messaging when coordinating with colleagues?\n3. Have you ever tried taking a break from digital screens?',
    suggestedTimeMinutes: 4,
    examinerTips: [
      'Demonstrate phrasal verbs and natural idiomatic expressions ("stay on top of", "unwind", "go cold turkey").',
      'Contrast different contexts (e.g. urgent matters vs asynchronous updates).'
    ],
    keyVocabulary: [
      { word: 'Asynchronous communication', meaning_bn: 'তাৎক্ষণিক উত্তর না দিয়ে সুবিধাজনক সময়ে বার্তা আদান-প্রদান' },
      { word: 'Cognitive clutter', meaning_bn: 'মস্তিষ্কের অপ্রয়োজনীয় তথ্যের জট' },
      { word: 'Digital detox', meaning_bn: 'ডিজিটাল ডিভাইস থেকে সাময়িক বিরতি' }
    ],
    modelAnswer:
      '1. Without a doubt, Notion is the cornerstone of my daily workflow. I rely on it to organize my academic reading lists, track project milestones, and declutter my mental workspace.\n\n2. For routine logistical updates, I strongly favor asynchronous text messaging because it allows the recipient to respond at their convenience without disrupting their concentration. However, if a nuanced misunderstanding arises, a quick two-minute phone call resolves it far more efficiently.\n\n3. Yes, every Sunday afternoon I practice a mini digital detox by locking my smartphone in a desk drawer and spending a few hours reading paperback fiction or tending to my balcony plants.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_spk1_3',
    module: 'Speaking Part 1',
    topic: 'Health',
    subType: 'Part 1 Interview',
    frequency: 'Practice Standard',
    title: 'Sleep Hygiene, Physical Fitness & Nutrition',
    prompt:
      '1. Do you follow a consistent sleep schedule during the week?\n2. What form of physical exercise helps you relieve academic or work stress?\n3. How have your eating habits evolved compared to five years ago?',
    suggestedTimeMinutes: 4,
    examinerTips: [
      'Use present perfect and past habitual structures ("I used to neglect...", "Lately, I have prioritized...").'
    ],
    keyVocabulary: [
      { word: 'Circadian rhythm', meaning_bn: 'শরীরের প্রাকৃতিক ঘুম ও জাগরণের দেহঘড়ি' },
      { word: 'Endorphin release', meaning_bn: 'ব্যায়ামের ফলে নিঃসৃত আনন্দদায়ক হরমোন' },
      { word: 'Nutrient-dense whole foods', meaning_bn: 'পুষ্টিসমৃদ্ধ প্রাকৃতিক খাবার' }
    ],
    modelAnswer:
      '1. I try my utmost to maintain a disciplined circadian rhythm by turning in around eleven o’clock each night. Whenever I compromise on seven hours of rest, my analytical focus the following morning plummets noticeably.\n\n2. Early morning brisk jogging around our neighborhood botanical park is my go-to stress reliever. The combination of fresh oxygen and steady endorphin release acts as a natural reset button for my mind.\n\n3. Five years ago, as an undergraduate, I subsisted largely on convenient takeaway snacks. Lately, however, I have transitioned toward preparing nutrient-dense home-cooked meals rich in leafy greens and lean proteins.',
    modelBand: 'Band 8.5'
  },

  // =========================================================================
  // SPEAKING PART 2 (CUE CARDS)
  // =========================================================================
  {
    id: 'qb_spk_1',
    module: 'Speaking Part 2',
    topic: 'Society & Culture',
    subType: 'Cue Card',
    frequency: 'Recent Real Exam',
    title: 'Describe an Important Traditional Festival in Your Country',
    prompt:
      'Describe an important traditional cultural festival or celebration in your country.',
    cueCardBulletPoints: [
      'What the festival is and when it takes place',
      'What rituals and traditional activities people perform',
      'What special delicacies or customary foods are prepared',
      'And explain why this festival is culturally significant to you and your community'
    ],
    suggestedTimeMinutes: 3,
    examinerTips: [
      'Use your 1 minute preparation time to jot down 3-4 high-band collocations for each bullet point.',
      'Do not stop talking until the examiner interrupts you at the 2-minute mark.',
      'Speak about emotions, communal unity, and sensory impressions (aroma, colorful attire).'
    ],
    keyVocabulary: [
      { word: 'Communal camaraderie', meaning_bn: 'সম্প্রদায়ের মধ্যকার পারস্পরিক সৌহার্দ্য' },
      { word: 'Sensory spectacle', meaning_bn: 'চোখ ও মনের পরম তৃপ্তিদায়ক উৎসব' },
      { word: 'Fostering cultural cohesion', meaning_bn: 'সাংস্কৃতিক সংহতি ও ঐক্য জোরদার করা' }
    ],
    modelAnswer:
      'I would like to speak about "Pohela Boishakh", which is the vibrant Bengali New Year festival celebrated annually on the fourteenth of April.\n\nThis celebration marks the dawn of the traditional harvest calendar. On this auspicious morning, individuals from every stratum of society dress in customary crimson and ivory attire. In Dhaka, thousands congregate at Ramna Park for traditional choral recitals greeting the new year, followed by the iconic Mongol Shobhajatra—a UNESCO-recognized celebratory carnival featuring colossal handmade papier-mâché masks representing peace and courage.\n\nA fundamental ritual of this celebration involves indulging in "Panta Ilish"—fermented soaked rice garnished with fried hilsa fish and green chilies. The communal aroma of roasted spices and sweetmeats permeates every thoroughfare.\n\nWhat makes this celebration profoundly meaningful to me is its egalitarian spirit. In a society occasionally fractured by political divergence, Pohela Boishakh serves as an inclusive bridge where religious and economic distinctions evaporate, reminding us of our shared historical heritage.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_spk2_2',
    module: 'Speaking Part 2',
    topic: 'Technology',
    subType: 'Cue Card',
    frequency: 'Recent Real Exam',
    title: 'Describe a Piece of Technology That Helped You Learn Something New',
    prompt:
      'Describe a digital tool, software application, or piece of equipment that significantly helped you master a difficult skill.',
    cueCardBulletPoints: [
      'What the technological tool or software was',
      'When and how you started using it',
      'How it helped you overcome specific learning obstacles',
      'And explain why you found it more effective than traditional learning methods'
    ],
    suggestedTimeMinutes: 3,
    examinerTips: [
      'Structure your monologue chronologically: Initial struggle -> Discovering the tool -> Breakthrough -> Reflection.',
      'Use past perfect and conditional structures to boost Grammatical Range.'
    ],
    keyVocabulary: [
      { word: 'Spaced-repetition algorithm', meaning_bn: 'নির্দিষ্ট বিরতিতে পুনরাবৃত্তির মাধ্যমে মনে রাখার পদ্ধতি' },
      { word: 'Steep learning curve', meaning_bn: 'শুরুর দিকে শেখার কঠিন ও জটিল ধাপ' },
      { word: 'Interactive diagnostics', meaning_bn: 'তাৎক্ষণিক ভুল চিহ্নিত করার প্রযুক্তি' }
    ],
    modelAnswer:
      'I would like to talk about an interactive pronunciation and spaced-repetition platform that revolutionized how I prepared for my academic English proficiency examination.\n\nRoughly eight months ago, I had hit a frustrating plateau in my spoken fluency and C1 lexical retention. Although I had filled dozens of paper notebooks with vocabulary lists, I would inevitably blank out when attempting to deploy those words in spontaneous conversation.\n\nA university mentor recommended an AI-assisted language studio that combined acoustic waveform feedback with an automated spaced-repetition flashcard deck. Whenever I mispronounced a multi-syllabic word or overused filler pauses, the software visually highlighted my pitch contour alongside a native British studio recording. Furthermore, its algorithm scheduled my vocabulary reviews right before I was statistically likely to forget a term.\n\nThe reason this technology proved infinitely superior to passive textbook study was its immediate, non-judgmental feedback loop. Had I relied solely on conventional rote memorization, I doubt I would have developed the acoustic self-awareness and confidence I possess today.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_spk2_3',
    module: 'Speaking Part 2',
    topic: 'Environment',
    subType: 'Cue Card',
    frequency: 'High-Frequency',
    title: 'Describe a Quiet Natural Place Where You Like to Relax',
    prompt:
      'Describe a tranquil natural location—such as a botanical garden, riverbank, or forest trail—where you go to unwind.',
    cueCardBulletPoints: [
      'Where this natural sanctuary is situated',
      'What flora, fauna, or landscape features you can observe there',
      'What activities you usually engage in while visiting',
      'And explain why this place restores your mental clarity'
    ],
    suggestedTimeMinutes: 3,
    examinerTips: [
      'Use vivid sensory imagery (visual canopy, auditory rustling of leaves, olfactory scent of damp earth).',
      'Contrast the tranquility of the spot with urban sensory overload.'
    ],
    keyVocabulary: [
      { word: 'Verdant canopy', meaning_bn: 'সবুজ গাছপালার ঘন ছায়াঘেরা আচ্ছাদন' },
      { word: 'Antidote to urban frenzy', meaning_bn: 'যান্ত্রিক শহরের কোলাহলের বিপরীতে প্রশান্তির আশ্রয়' },
      { word: 'Contemplative solitude', meaning_bn: 'চিন্তাশীল ও প্রশান্ত একাকীত্ব' }
    ],
    modelAnswer:
      'Whenever the relentless clamor of metropolitan life becomes overwhelming, I retreat to the Baldha Botanical Garden, a century-old arboretum tucked away in the historic heart of Dhaka.\n\nDespite being surrounded by congested thoroughfares, the moment one steps through its wrought-iron gates, the decibel level drops dramatically. The sanctuary is renowned for its dense, verdant canopy of rare camellias, giant Amazonian water lilies floating on a central rectangular pond, and ancient baobab trees collected by a twentieth-century naturalist.\n\nWhen I visit on crisp Saturday mornings, I typically leave my phone on airplane mode, bring a thermos of Darjeeling tea, and sit on a weathered stone bench beside the lotus pond. I spend an hour sketching architectural foliage or simply observing kingfishers diving into the emerald water.\n\nThis botanical haven acts as a potent antidote to urban frenzy. Immersing myself in that contemplative solitude recalibrates my nervous system and replenishes my creative energy for the week ahead.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_spk2_4',
    module: 'Speaking Part 2',
    topic: 'Economy & Work',
    subType: 'Cue Card',
    frequency: 'Practice Standard',
    title: 'Describe a Challenging Goal You Achieved Through Teamwork',
    prompt:
      'Describe an ambitious academic or professional project that you successfully completed as part of a team.',
    cueCardBulletPoints: [
      'What the objective of the project was',
      'Who your teammates were and how responsibilities were divided',
      'What major obstacle or disagreement you had to overcome',
      'And explain how you felt when the project was finally delivered'
    ],
    suggestedTimeMinutes: 3,
    examinerTips: [
      'Highlight collaborative leadership, conflict resolution, and delegating tasks by comparative strength.'
    ],
    keyVocabulary: [
      { word: 'Synergistic collaboration', meaning_bn: 'সম্মিলিত প্রচেষ্টার মাধ্যমে বহুগুণ ফল লাভ' },
      { word: 'Tight deadline', meaning_bn: 'অত্যন্ত সংক্ষিপ্ত ও কঠোর সময়সীমা' },
      { word: 'Consensus building', meaning_bn: 'সবার মতামতের ভিত্তিতে ঐকমত্য প্রতিষ্ঠা' }
    ],
    modelAnswer:
      'A quintessential example of synergistic collaboration occurred during my final undergraduate semester, when four classmates and I designed a solar-powered water filtration prototype for a national engineering symposium.\n\nOur objective was to build a portable filtration unit costing under fifty dollars for flood-prone rural communities. To maximize efficiency, we partitioned tasks according to our technical strengths: two members handled photovoltaic circuitry, another managed membrane chemistry, and I coordinated structural CAD modeling and financial budgeting.\n\nMidway through the six-week sprint, we encountered a daunting setback when our primary pump supplier failed to deliver. Tensions flared as half the team wanted to postpone our demonstration. I convened an emergency brainstorming session where we reached a consensus to repurpose a salvaged automotive pump and recalibrate our voltage regulator overnight.\n\nWhen our prototype functioned flawlessly before the judging panel and clinched the runner-up innovation grant, I experienced an overwhelming sense of collective pride. It taught me that resilient teamwork can surmount almost any logistical crisis.',
    modelBand: 'Band 9.0'
  },

  // =========================================================================
  // SPEAKING PART 3 (ABSTRACT ANALYTICAL DISCUSSION)
  // =========================================================================
  {
    id: 'qb_spk_2',
    module: 'Speaking Part 3',
    topic: 'Society & Culture',
    subType: 'In-Depth Discussion',
    frequency: 'Recent Real Exam',
    title: 'Globalization vs Traditional Cultural Identity',
    prompt:
      'Do you believe that global media and Western consumerism are causing local traditions to disappear, or are traditional cultures resilient enough to survive?',
    suggestedTimeMinutes: 4,
    examinerTips: [
      'Use abstract academic language rather than personal anecdotes.',
      'Acknowledge both sides before delivering your balanced conclusion.',
      'Use discourse markers: "In my appraisal...", "On one hand...", "However, through an anthropological lens..."'
    ],
    keyVocabulary: [
      { word: 'Cultural homogenization', meaning_bn: 'বিশ্বায়নের প্রভাবে সব সংস্কৃতির একাকার হয়ে যাওয়া' },
      { word: 'Dynamic hybridization', meaning_bn: 'ঐতিহ্য ও আধুনিকতার সংমিশ্রণ' },
      { word: 'Erosion of intangible heritage', meaning_bn: 'লোকজ ও সাংস্কৃতিক ঐতিহ্যের অবক্ষয়' }
    ],
    modelAnswer:
      'In my appraisal, globalization exerts a dual, contradictory influence on indigenous cultures. On one hand, the ubiquity of transnational media conglomerates has fostered a degree of cultural homogenization, where youth in disparate parts of the globe adopt identical Western apparel, fast food diets, and musical tastes at the expense of indigenous customs.\n\nHowever, viewing this dynamic through a broader anthropological lens, cultures are rarely passive recipients of external influence. Instead, we observe dynamic hybridization, where communities creatively fuse modern digital tools to document and revitalize ancestral rituals. For example, traditional folk musicians now leverage international streaming platforms to reach worldwide audiences. Therefore, rather than outright extinction, cultural identity is evolving into an interconnected global tapestry.',
    modelBand: 'Band 8.5'
  },
  {
    id: 'qb_spk3_2',
    module: 'Speaking Part 3',
    topic: 'Education',
    subType: 'In-Depth Discussion',
    frequency: 'High-Frequency',
    title: 'The Future Role of Universities in the Age of AI',
    prompt:
      'With free online courses and artificial intelligence tutors available to anyone with an internet connection, will traditional brick-and-mortar universities become obsolete in the next twenty years?',
    suggestedTimeMinutes: 4,
    examinerTips: [
      'Distinguish between "information transmission" (which AI can do) and "socialization, laboratory research, and credentialing" (which universities provide).'
    ],
    keyVocabulary: [
      { word: 'Democratization of knowledge', meaning_bn: 'জ্ঞানের অবাধ ও সর্বজনীন বিস্তার' },
      { word: 'Socratic debate', meaning_bn: 'প্রশ্নোত্তর ও যুক্তির মাধ্যমে জ্ঞান অন্বেষণ' },
      { word: 'Peer networking', meaning_bn: 'সহপাঠীদের সাথে পেশাগত ও বুদ্ধিবৃত্তিক যোগাযোগ' }
    ],
    modelAnswer:
      'While generative AI tutors and massive open online courses have undeniably democratized access to raw information, predicting the demise of physical universities fundamentally misunderstands their core societal function.\n\nIf a university merely existed to recite textbook lectures, digital automation would indeed render it redundant. However, residential campuses serve as irreplaceable incubators for wet-laboratory experimentation, Socratic debate among diverse peers, and lifelong professional networking. Furthermore, employers continue to rely on accredited institutions for rigorous, proctored verification of a candidate’s intellectual perseverance. Consequently, rather than vanishing, brick-and-mortar universities will evolve by offloading rote lecturing to AI platforms while dedicating campus hours to collaborative research and ethical mentorship.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_spk3_3',
    module: 'Speaking Part 3',
    topic: 'Environment',
    subType: 'In-Depth Discussion',
    frequency: 'Practice Standard',
    title: 'Corporate Accountability vs Individual Climate Action',
    prompt:
      'Should the responsibility for reducing carbon emissions fall primarily on individual consumers changing their lifestyles, or on governments and multinational fossil-fuel corporations?',
    suggestedTimeMinutes: 4,
    examinerTips: [
      'Weigh systemic industrial scale against grassroots consumer demand.',
      'Use concession structures ("While conscientious consumerism is laudable, systemic decarbonization requires...").'
    ],
    keyVocabulary: [
      { word: 'Systemic decarbonization', meaning_bn: 'কাঠামোগতভাবে কার্বন নিঃসরণ শূন্যে নামিয়ে আনা' },
      { word: 'Greenwashing', meaning_bn: 'পরিবেশবান্ধব হওয়ার ভুয়া বা অতিরঞ্জিত প্রচারণা' },
      { word: 'Regulatory enforcement', meaning_bn: 'আইনি বাধ্যবাধকতা ও কঠোর নজরদারি' }
    ],
    modelAnswer:
      'While conscientious individual habits—such as curtailing air travel or adopting plant-rich diets—are ethically laudable, placing the primary onus of climate mitigation on ordinary citizens is structurally disproportionate.\n\nEmpirical audits consistently reveal that a small fraction of heavy industrial conglomerates and fossil-fuel extractors generate over seventy percent of global greenhouse emissions. Even if millions of households diligently recycle, their efforts are dwarfed by unmitigated coal power generation and global shipping fleets. Therefore, systemic decarbonization necessitates sovereign regulatory enforcement: carbon border taxes, mandatory renewable grid transitions, and strict penalties against corporate greenwashing. Individual consumer pressure is valuable chiefly insofar as it compels politicians and boardrooms to enact these macro-level reforms.',
    modelBand: 'Band 9.0'
  },

  // =========================================================================
  // READING (ACADEMIC PASSAGES & COMPREHENSION MODULES)
  // =========================================================================
  {
    id: 'qb_read_1',
    module: 'Reading',
    topic: 'Technology',
    subType: 'True / False / Not Given & Matching',
    frequency: 'Recent Real Exam',
    title: 'Passage: Quantum Cryptography & The Post-Silicon Era',
    prompt:
      'READ THE PASSAGE EXCERPT & ANSWER QUESTIONS 1–4:\n\n[A] For over four decades, global financial transactions and sovereign diplomatic communications have relied upon asymmetric public-key encryption, notably the RSA protocol. This mathematical fortress rests on a simple computational asymmetry: while multiplying two massive prime numbers is trivial for conventional silicon microprocessors, factoring their product back into the original primes would require thousands of years.\n\n[B] However, the emergence of fault-tolerant quantum computers threatens to shatter this cryptographic paradigm. By exploiting quantum superposition and entanglement, a sufficiently powerful quantum processor running Shor’s algorithm could factorize RSA-2048 keys in a matter of hours. Intelligence agencies are already executing "harvest now, decrypt later" operations—intercepting and archiving encrypted state secrets today with the expectation of unlocking them once quantum hardware matures.\n\n[C] To counter this existential vulnerability, physicists have pioneered Quantum Key Distribution (QKD). Unlike mathematical encryption, QKD encodes cryptographic keys into the polarization states of individual photons transmitted across fiber-optic cables. Because the Heisenberg Uncertainty Principle dictates that measuring a quantum system irreversibly perturbs its state, any clandestine eavesdropper attempting to intercept the photon stream immediately introduces detectable bit-error anomalies.\n\nQUESTIONS:\n1. Multiplying two large prime numbers is computationally exhausting for standard silicon computers. (TRUE / FALSE / NOT GIVEN)\n2. Intelligence agencies are currently storing encrypted data to decode when quantum processors become powerful enough. (TRUE / FALSE / NOT GIVEN)\n3. Quantum Key Distribution relies on the Heisenberg Uncertainty Principle to detect eavesdropping. (TRUE / FALSE / NOT GIVEN)\n4. Satellite-based QKD is less expensive to deploy than fiber-optic QKD. (TRUE / FALSE / NOT GIVEN)',
    suggestedTimeMinutes: 15,
    examinerTips: [
      'Watch out for reversed polarity traps in Question 1 ("trivial" vs "computationally exhausting").',
      'Remember that NOT GIVEN means the passage provides neither confirmation nor contradiction (Question 4).'
    ],
    keyVocabulary: [
      { word: 'Computational asymmetry', meaning_bn: 'গাণিতিক হিসাবের একমুখী সহজতা ও বিপরীতমুখী জটিলতা' },
      { word: 'Clandestine eavesdropper', meaning_bn: 'গোপনে তথ্য আড়ি পাতা ব্যক্তি বা সংস্থা' },
      { word: 'Irreversibly perturbs', meaning_bn: 'স্থায়ীভাবে ও অপরিবর্তনীয়ভাবে বিচ্যুত করে' }
    ],
    modelAnswer:
      'OFFICIAL ANSWER KEY & EXAMINER EVIDENCE:\n\n1. FALSE — Paragraph [A] explicitly states that "multiplying two massive prime numbers is trivial for conventional silicon microprocessors"; it is factoring the product back into primes that requires thousands of years.\n\n2. TRUE — Paragraph [B] confirms that intelligence agencies are executing "harvest now, decrypt later" operations—intercepting and archiving encrypted secrets today to unlock once quantum hardware matures.\n\n3. TRUE — Paragraph [C] explains that because of the Heisenberg Uncertainty Principle, measuring a quantum system perturbs its state, alerting the network to any eavesdropper.\n\n4. NOT GIVEN — Paragraph [C] mentions fiber-optic cables, but there is zero mention of satellite-based QKD or any cost comparison between the two.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_read_2',
    module: 'Reading',
    topic: 'Environment',
    subType: 'Summary Completion & TFNG',
    frequency: 'Practice Standard',
    title: 'Passage: The Mycorrhizal Wood-Wide Web in Boreal Forests',
    prompt:
      'READ THE PASSAGE EXCERPT & COMPLETE QUESTIONS 1–4:\n\n[A] Beneath the detritus of boreal forest floors lies a sprawling subterranean telecommunications network composed of mycorrhizal fungi. Far from being passive saprophytes, these microscopic fungal mycelia fuse symbiotically with the root tips of towering conifers. In a mutually advantageous biological barter, trees photosynthesize atmospheric carbon into hexose sugars and channel up to thirty percent of this carbohydrate yield downward to nourish the fungi. In reciprocation, the fungal hyphae—which boast a surface area orders of magnitude greater than coarse tree roots—mine the mineral soil for recalcitrant phosphorus and nitrogen.\n\n[B] Pioneering isotope-tracing experiments conducted by forest ecologist Dr. Suzanne Simard revealed that this mycorrhizal lattice operates as a redistributive resource grid. Towering "hub trees" or "mother trees" occupying the sunlit upper canopy shunt surplus carbon isotopes, water, and defense enzymes through fungal conduits to shaded understory seedlings struggling to survive. Remarkably, when a hub tree is infested by defoliating bark beetles, it transmits biochemical distress signals across the mycelial network, prompting neighboring trees to synthesize bitter phenolic compounds prior to insect arrival.\n\nQUESTIONS (Complete with ONE WORD ONLY from the passage):\n1. Trees supply mycorrhizal fungi with up to 30% of their photosynthesized ________.\n2. Fungal hyphae extract essential nitrogen and ________ from the mineral soil.\n3. Sunlit "mother trees" transfer surplus nutrients to shaded ________ seedlings.\n4. Infested trees transmit biochemical signals that prompt neighbors to produce protective ________ compounds.',
    suggestedTimeMinutes: 15,
    examinerTips: [
      'For Summary Completion with "ONE WORD ONLY", copy the exact morphological word from the text without changing singular/plural or adding articles.',
      'Check grammar fit before and after the blank.'
    ],
    keyVocabulary: [
      { word: 'Symbiotic barter', meaning_bn: 'পারস্পরিক উপকারী জৈবিক বিনিময় প্রথা' },
      { word: 'Subterranean lattice', meaning_bn: 'মাটির নিচের জালের মতো বিস্তৃত কাঠামো' },
      { word: 'Defoliating pests', meaning_bn: 'গাছের পাতা ও বাকল ধ্বংসকারী পোকামাকড়' }
    ],
    modelAnswer:
      'OFFICIAL ANSWER KEY & EXAMINER EVIDENCE:\n\n1. CARBOHYDRATE (or SUGARS) — Paragraph [A]: "...channel up to thirty percent of this carbohydrate yield downward to nourish the fungi."\n\n2. PHOSPHORUS — Paragraph [A]: "...mine the mineral soil for recalcitrant phosphorus and nitrogen."\n\n3. UNDERSTORY — Paragraph [B]: "...shunt surplus carbon isotopes, water, and defense enzymes through fungal conduits to shaded understory seedlings..."\n\n4. PHENOLIC — Paragraph [B]: "...prompting neighboring trees to synthesize bitter phenolic compounds prior to insect arrival."',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_read_3',
    module: 'Reading',
    topic: 'Urbanization',
    subType: 'Matching Headings & Multiple Choice',
    frequency: 'High-Frequency',
    title: 'Passage: Biomimetic Architecture & Passive Thermal Regulation',
    prompt:
      'READ THE PASSAGE EXCERPT & ANSWER QUESTIONS 1–3:\n\n[A] Modern glass-curtain skyscrapers function as thermal greenhouses, absorbing intense solar radiation and requiring colossal HVAC air-conditioning energy to remain habitable. Seeking a low-carbon alternative, avant-garde architects are turning to biomimicry—emulating evolutionary survival mechanisms refined over millions of years in the natural world.\n\n[B] The quintessential triumph of biomimetic urbanism is the Eastgate Centre in Harare, Zimbabwe. Designed by architect Mick Pearce, the commercial complex is modeled directly on the self-cooling earthen mounds constructed by Macrotermes michaelseni termites. Although Zimbabwean savannah temperatures fluctuate from 40°C during the day to 5°C at night, termites maintain their subterranean fungal chambers at a precise 30.5°C by opening and closing a labyrinth of convective air vents. Replicating this passive stack ventilation through porous concrete chimneys and thermal-mass slabs, the Eastgate Centre consumes 90% less ventilation energy than conventional buildings of comparable volume.\n\nQUESTIONS:\n1. Why are conventional glass skyscrapers criticized in Paragraph A?\n2. Which organism inspired the passive cooling engineering of the Eastgate Centre?\n3. By what percentage did the Eastgate Centre reduce ventilation energy consumption compared to standard buildings?',
    suggestedTimeMinutes: 12,
    examinerTips: [
      'Scan for capital letters, proper nouns (Harare, Mick Pearce), and numerical percentages (90%) to anchor your reading locus immediately.'
    ],
    keyVocabulary: [
      { word: 'Biomimicry', meaning_bn: 'প্রকৃতির জীববৈচিত্র্য ও কৌশল অনুকরণ করে প্রযুক্তি উদ্ভাবন' },
      { word: 'Convective ventilation', meaning_bn: 'তাপমাত্রার পার্থক্যের মাধ্যমে বায়ুপ্রবাহ ও শীতলীকরণ' },
      { word: 'Thermal mass', meaning_bn: 'তাপ শোষণ ও ধরে রাখার ভৌত সক্ষমতা' }
    ],
    modelAnswer:
      'OFFICIAL ANSWER KEY & EXAMINER EVIDENCE:\n\n1. They act as thermal greenhouses that trap solar radiation and require massive HVAC air-conditioning energy to remain habitable (Paragraph A).\n\n2. Macrotermes michaelseni termites / Subterranean termite mounds (Paragraph B).\n\n3. 90% (ninety percent) reduction in ventilation energy compared to conventional buildings of equivalent size (Paragraph B).',
    modelBand: 'Band 9.0'
  },

  // =========================================================================
  // LISTENING (SECTIONS 1–4 SCRIPTS & QUESTIONS)
  // =========================================================================
  {
    id: 'qb_lis_1',
    module: 'Listening',
    topic: 'Education',
    subType: 'Section 3 · Academic Research Discussion',
    frequency: 'Recent Real Exam',
    title: 'Urban Microplastics & Estuarine Sediment Core Sampling',
    prompt:
      'LISTEN / READ THE SECTION 3 ACADEMIC DIALOGUE & ANSWER QUESTIONS 1–4:\n\nDr. Henderson (Tutor): "Good morning, Maya and Liam. Let’s review the methodology for your estuarine microplastic dissertation. Did you finalize your sediment extraction equipment?"\nLiam: "Initially I wanted to deploy a standard surface manta trawl mesh, Dr. Henderson, because it covers a wide transect quickly. However, Maya pointed out that synthetic nylon ropes on the trawl shed fibers, so we agreed on a stainless-steel gravity corer lined with acrylic tubes to prevent cross-contamination."\nMaya: "Exactly. And regarding polymer verification in the lab, visual microscopy alone produces a 30% false-positive rate. Therefore, we booked the chemistry faculty’s FTIR spectrometer to match infrared absorption spectra."\nDr. Henderson: "Sensible decision. And what did your pilot samples from the upper estuary reveal?"\nLiam: "We had hypothesized that industrial plastic pellets from the riverside packaging plant would dominate. Surprisingly, over 82% of the particles were synthetic polyester microfibers discharged from domestic washing machine effluents."\n\nQUESTIONS:\n1. Why did the students reject the surface manta trawl mesh?\n2. Which equipment did they select to collect sediment cores?\n3. Which laboratory method will they use to verify polymer types?\n4. What was the primary source of the microplastics found in their pilot samples?',
    suggestedTimeMinutes: 10,
    examinerTips: [
      'In Listening Section 3, speakers almost always propose an initial option ("Initially I wanted...") and then reject it in favor of a second option ("so we agreed on..."). Wait for the consensus!'
    ],
    keyVocabulary: [
      { word: 'Cross-contamination', meaning_bn: 'নমুনা সংগ্রহের সময় বাইরের দূষকের সংমিশ্রণ' },
      { word: 'False-positive rate', meaning_bn: 'ভুলবশত ইতিবাচক ফলাফল আসার হার' },
      { word: 'Domestic effluents', meaning_bn: 'বাসাবাড়ির পয়ঃনিষ্কাশন ও ধোয়ামোছার বর্জ্য পানি' }
    ],
    modelAnswer:
      'OFFICIAL ANSWER KEY & DISTRACTOR ANALYSIS:\n\n1. Because its synthetic nylon ropes shed fibers and cause cross-contamination (Distractor: covering a wide transect was the initial reason Liam liked it).\n\n2. A stainless-steel gravity corer (lined with acrylic tubes).\n\n3. FTIR spectrometer / FTIR spectroscopy (Visual microscopy was rejected due to a 30% false-positive rate).\n\n4. Domestic washing machine effluents / synthetic polyester microfibers (Industrial plastic pellets from the packaging plant was their disproven hypothesis).',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_lis_2',
    module: 'Listening',
    topic: 'Environment',
    subType: 'Section 4 · University Lecture Note Completion',
    frequency: 'Practice Standard',
    title: 'Hadal Zone Geophysics & Deep-Trench Piezophile Biology',
    prompt:
      'COMPLETE THE LECTURE SUMMARY BELOW (ONE WORD AND/OR A NUMBER):\n\nTranscript Excerpt (Prof. Malcolm): "Good morning. Today we examine the Hadal Zone—oceanic trenches descending beyond 6,000 meters. In the Mariana Trench, hydrostatic pressure exceeds 1,086 bar. Under such crushing force, normal cellular membranes stiffen and enzymes denature. How do hadal vertebrates survive? They accumulate high intracellular concentrations of an organic molecule called TMAO, which stabilizes protein folding against pressure. In 2014, autonomous landers filmed the deepest living vertebrate—the translucent Mariana snailfish—foraging at 8,145 meters. Instead of calcified scales and brittle bones, its skull remains partially cartilaginous. Furthermore, steep V-shaped trench walls funnel descending organic detritus, known as marine snow, into the trench floor, fueling thriving chemoautotrophic and heterotrophic communities. Alarmingly, gut assays of hadal amphipods revealed synthetic microfibers originating from domestic textiles."\n\nCOMPLETE NOTES:\n1. Hadal organisms prevent protein collapse using the molecule ________.\n2. The deepest vertebrate ever filmed is the Mariana ________ at 8,145 meters.\n3. Trench walls funnel descending biological detritus termed marine ________.\n4. Hadal amphipods were found to have ingested microfibers from synthetic ________.',
    suggestedTimeMinutes: 10,
    examinerTips: [
      'Section 4 has NO break in the middle. Follow the signposting words ("How do hadal vertebrates survive?", "Furthermore,", "Alarmingly,") to stay anchored.'
    ],
    keyVocabulary: [
      { word: 'Hydrostatic pressure', meaning_bn: 'গভীর পানির প্রচণ্ড চাপ' },
      { word: 'Protein denaturing', meaning_bn: 'প্রোটিনের স্বাভাবিক গঠন ভেঙে যাওয়া' },
      { word: 'Benthic detritus', meaning_bn: 'সমুদ্রের তলদেশে জমা হওয়া জৈব অবশিষ্টাংশ' }
    ],
    modelAnswer:
      'OFFICIAL ANSWER KEY:\n\n1. TMAO\n2. SNAILFISH\n3. SNOW\n4. TEXTILES',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_lis_3',
    module: 'Listening',
    topic: 'Society & Culture',
    subType: 'Section 1 · Transactional Form Completion',
    frequency: 'High-Frequency',
    title: 'Cotswolds Heritage Railway Volunteer Registration',
    prompt:
      'COMPLETE THE REGISTRATION FORM (NO MORE THAN TWO WORDS AND/OR A NUMBER):\n\nTranscript Excerpt:\nCoordinator (Oliver): "Good morning, Cotswolds Heritage Steam Railway. May I take your details for our summer volunteer intake?"\nApplicant (Eleanor): "Yes, my surname is Braithwaite—spelled B-R-A-I-T-H-W-A-I-T-E."\nCoordinator: "Thank you. And your current postcode?"\nApplicant: "I moved last month from GL50 2AA; my new postcode is GL54 1BN."\nCoordinator: "Got it: GL54 1BN. Which volunteer division appeals to you most? We have ticket office duties or locomotive restoration."\nApplicant: "I have a background in carpentry, so I’d love to join the carriage restoration workshop."\nCoordinator: "Wonderful. Mandatory safety induction takes place on Saturday the 14th of June, and you will need steel-capped boots."\n\nQUESTIONS:\n1. Applicant Surname: ________\n2. Current Postcode: ________\n3. Assigned Division: ________ workshop\n4. Mandatory equipment required: ________ boots',
    suggestedTimeMinutes: 8,
    examinerTips: [
      'Watch out for postcode self-correction ("moved last month from GL50 2AA; my new postcode is GL54 1BN").',
      'Check hyphenated words like "steel-capped".'
    ],
    keyVocabulary: [
      { word: 'Heritage preservation', meaning_bn: 'ঐতিহাসিক নিদর্শন সংরক্ষণ' },
      { word: 'Safety induction', meaning_bn: 'নিরাপত্তা বিষয়ক প্রাথমিক প্রশিক্ষণ' },
      { word: 'Rolling stock', meaning_bn: 'রেলগাড়ির ইঞ্জিন ও বগিসমূহ' }
    ],
    modelAnswer:
      'OFFICIAL ANSWER KEY:\n\n1. BRAITHWAITE\n2. GL54 1BN (GL50 2AA is the old address distractor)\n3. CARRIAGE RESTORATION\n4. STEEL-CAPPED',
    modelBand: 'Band 9.0'
  },

  // =========================================================================
  // ADDITIONAL WRITING TASK 2 PROMPTS (CAMBRIDGE VOLUMES 14–21)
  // =========================================================================
  {
    id: 'qb_w2_11',
    module: 'Writing Task 2',
    topic: 'Urbanization',
    subType: 'Agree / Disagree',
    frequency: 'Recent Real Exam',
    title: 'Congestion Pricing & Car-Free Metropolitan Centers',
    prompt:
      'Some urban planners believe that the only effective way to reduce traffic congestion and air pollution in major cities is to ban private cars from city centers entirely. To what extent do you agree or disagree?',
    targetWordCount: '260–310 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Notice the absolute qualifier "the only effective way" — argue that while pedestrianization is beneficial, it must be preceded by affordable mass-transit expansion and exemptions for disabled residents.'
    ],
    keyVocabulary: [
      { word: 'Congestion pricing', meaning_bn: 'ব্যস্ত সময়ে শহরে গাড়ি প্রবেশের বিশেষ শুল্ক' },
      { word: 'Modal shift', meaning_bn: 'ব্যক্তিগত গাড়ি ছেড়ে গণপরিবহনে যাতায়াতের পরিবর্তন' },
      { word: 'Vehicular emissions', meaning_bn: 'যানবাহন থেকে নির্গত দূষিত ধোঁয়া' }
    ],
    modelAnswer:
      'As metropolitan arteries grind to a halt under the weight of private automobile ownership, radical proposals to prohibit private vehicles from downtown precincts have gained traction. While I acknowledge that pedestrianized zones significantly curb particulate emissions, I disagree that an outright ban is the sole or most equitable remedy; rather, integrated mass transit and dynamic congestion pricing offer a more pragmatic blueprint.\n\nProponents of total vehicular exclusion point to European capitals such as Oslo and Ghent, where car-free boulevards have revitalized street-level commerce and slashed nitrogen dioxide concentrations. However, enforcing a blanket prohibition without first constructing high-capacity subterranean rail and electrified bus networks merely displaces gridlock to suburban ring roads. Moreover, elderly citizens, tradespeople transporting heavy tools, and individuals with mobility impairments rely on vehicular access for basic livelihood.\n\nA far more nuanced strategy involves coupling congestion-charge zones—similar to London’s Ultra Low Emission Zone—with subsidized metro fares and protected cycling lanes. Revenue harvested from motorist tolls can directly finance zero-emission public transit. In conclusion, banning private automobiles is an overly blunt instrument unless embedded within a broader ecosystem of accessible public transportation.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_w2_12',
    module: 'Writing Task 2',
    topic: 'Health',
    subType: 'Discuss Both Views',
    frequency: 'Practice Standard',
    title: 'Preventive Lifestyle Medicine vs Advanced Hospital Treatment',
    prompt:
      'Some people argue that national healthcare budgets should allocate a much larger share of funding to preventive health education and fitness initiatives, while others believe governments must prioritize hospital beds, surgical equipment, and pharmaceuticals. Discuss both views and give your opinion.',
    targetWordCount: '260–320 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Contrast upstream prevention (cost-effective long-term reduction in chronic illness) with downstream acute care (ethical obligation to treat immediate trauma and genetic illness).'
    ],
    keyVocabulary: [
      { word: 'Upstream prevention', meaning_bn: 'রোগ হওয়ার আগেই তা প্রতিরোধের প্রাথমিক ব্যবস্থা' },
      { word: 'Acute clinical intervention', meaning_bn: 'জরুরি ও জটিল রোগের তাৎক্ষণিক চিকিৎসা' },
      { word: 'Epidemiological transition', meaning_bn: 'সংক্রামক রোগের বদলে জীবনযাত্রাজনিত রোগের বিস্তার' }
    ],
    modelAnswer:
      'The optimal distribution of finite public healthcare expenditure between upstream preventive initiatives and downstream acute clinical care remains a perennial dilemma for health ministries. While acute hospital infrastructure is ethically non-negotiable for saving lives in crisis, I contend that shifting fiscal weight toward preventive medicine is the only way to prevent national health systems from collapsing.\n\nOn the one hand, tertiary hospitals, oncology wards, and trauma centers cannot be starved of capital. Genetic malignancies, road accidents, and obstetric emergencies occur regardless of how nutritious a population’s diet may be. A civilized state bears an immediate moral duty to provide advanced surgical intervention and life-saving pharmaceuticals to citizens in acute distress.\n\nOn the other hand, modern epidemiological data reveals that over seventy percent of hospital admissions stem from preventable lifestyle conditions, including cardiovascular disease, Type 2 diabetes, and smoking-related pulmonary disorders. Treating end-stage organ failure costs taxpayers hundreds of times more than funding community nutrition workshops, municipal sports facilities, and early diagnostic screenings. In conclusion, while acute clinical capacity must be safeguarded, governments must substantially expand preventive health funding to curb the root causes of chronic disease.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_w2_13',
    module: 'Writing Task 2',
    topic: 'Society & Culture',
    subType: 'Advantages & Disadvantages',
    frequency: 'High-Frequency',
    title: 'Cashless Societies & Digital Payment Ecosystems',
    prompt:
      'In many countries, physical banknotes and coins are rapidly being replaced by contactless cards and mobile payment apps. Do the advantages of living in a completely cashless society outweigh the disadvantages?',
    targetWordCount: '250–310 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Highlight transparency, tax compliance, and hygiene as advantages.',
      'Weigh against cybersecurity outages, algorithmic surveillance, and financial exclusion of unbanked/elderly populations.'
    ],
    keyVocabulary: [
      { word: 'Financial inclusion', meaning_bn: 'সব শ্রেণির মানুষকে ব্যাংকিং সেবার আওতায় আনা' },
      { word: 'Illicit shadow economy', meaning_bn: 'কর ফাঁকি ও অবৈধ লেনদেনের কালো অর্থনীতি' },
      { word: 'Systemic cyber vulnerability', meaning_bn: 'প্রযুক্তিগত ও সাইবার নিরাপত্তার ঝুঁকি' }
    ],
    modelAnswer:
      'The rapid displacement of physical currency by biometric mobile wallets and contactless debit networks has transformed everyday commerce. While a cashless economy streamlines transaction velocity and curbs illicit tax evasion, I believe the disadvantages of abolishing physical legal tender altogether slightly outweigh the benefits unless robust safeguards protect vulnerable citizens.\n\nUndeniably, digital payment ecosystems offer compelling macroeconomic and practical merits. For merchants and consumers alike, contactless settlements eliminate the logistical costs of armored cash transport and counterfeit verification. More importantly, because electronic transfers leave an immutable audit trail, governments can effectively constrict the illicit shadow economy, money laundering, and bribery.\n\nNevertheless, a purely cashless mandate carries severe socio-economic hazards. Millions of elderly citizens, rural laborers, and low-income individuals lack smartphones or formal banking credentials, risking total disenfranchisement from basic commerce. Furthermore, total reliance on cloud banking exposes an entire nation to systemic paralysis during power grid failures or sovereign cyberattacks, while eroding financial privacy. In conclusion, while digital payments should be encouraged as the primary medium, retaining physical cash as a public backup remains essential for inclusivity and resilience.',
    modelBand: 'Band 8.5'
  },
  {
    id: 'qb_w2_14',
    module: 'Writing Task 2',
    topic: 'Economy & Work',
    subType: 'Discuss Both Views',
    frequency: 'Recent Real Exam',
    title: 'Universal Basic Income (UBI) vs Targeted Welfare',
    prompt:
      'Some economists propose that governments should pay every adult citizen a guaranteed Universal Basic Income (UBI) each month, regardless of whether they work. Others argue that state welfare should only be given to those in verified financial need. Discuss both views and give your opinion.',
    targetWordCount: '260–320 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Compare the administrative simplicity and anti-automation buffer of UBI against the fiscal cost and inflation risks.'
    ],
    keyVocabulary: [
      { word: 'Means-tested welfare', meaning_bn: 'আয় ও সম্পদের যাচাই সাপেক্ষে প্রদত্ত সরকারি ভাতা' },
      { word: 'Bureaucratic overhead', meaning_bn: 'প্রশাসনিক পরিচালনা ও আমলাতান্ত্রিক ব্যয়' },
      { word: 'Fiscal sustainability', meaning_bn: 'রাষ্ট্রীয় বাজেটের দীর্ঘমেয়াদী সক্ষমতা' }
    ],
    modelAnswer:
      'As technological automation destabilizes traditional wage labor, the proposal to institute an unconditional Universal Basic Income (UBI) has moved from academic fringes to mainstream policy debate. While UBI proponents laud its ability to eradicate poverty without bureaucratic stigma, fiscal conservatives champion targeted, means-tested welfare. I contend that targeted social safety nets coupled with job retraining remain far more fiscally sustainable than universal payouts.\n\nAdvocates of UBI emphasize that traditional welfare programs suffer from punitive bureaucratic overhead and "poverty traps," wherein recipients lose benefits the moment they accept part-time work. By providing an unconditional floor to every citizen, UBI empowers unpaid caregivers, stimulates grassroots entrepreneurship, and cushions workers displaced by artificial intelligence.\n\nHowever, distributing monthly stipends to millionaires and struggling laborers alike is an extraordinarily inefficient allocation of finite tax revenue. Financing a meaningful UBI would necessitate astronomical hikes in income and corporate taxation, potentially triggering capital flight and demand-pull inflation that erodes purchasing power for the very poor it seeks to assist. In conclusion, rather than dispersing treasury funds indiscriminately, governments should streamline means-tested assistance and invest heavily in vocational upskilling.',
    modelBand: 'Band 9.0'
  },

  // =========================================================================
  // ADDITIONAL WRITING TASK 1 REPORTS & LETTERS
  // =========================================================================
  {
    id: 'qb_w1_7',
    module: 'Writing Task 1',
    topic: 'Technology',
    subType: 'Table',
    frequency: 'Recent Real Exam',
    title: 'Global Electric Vehicle Adoption & Charging Infrastructure (2025)',
    prompt:
      'The table below gives information about electric vehicle (EV) market share, public fast-charging stations per 100,000 residents, and average government purchase subsidies across five countries in 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    targetWordCount: '160–195 words',
    suggestedTimeMinutes: 20,
    examinerTips: [
      'Look for correlations across columns (e.g. high charging density correlating with high EV adoption even when subsidies are phased down).'
    ],
    keyVocabulary: [
      { word: 'Market penetration', meaning_bn: 'বাজারে কোনো পণ্যের বিস্তৃতি বা অংশীদারিত্ব' },
      { word: 'Per capita density', meaning_bn: 'জনসংখ্যা অনুপাতে ঘনত্বের হার' },
      { word: 'Stark disparity', meaning_bn: 'সুস্পষ্ট ও প্রকট বৈষম্য' }
    ],
    modelAnswer:
      'The table compares five nations—Norway, China, Germany, the United States, and India—in terms of new electric vehicle (EV) sales share, public fast-charging density, and state purchase incentives in 2025.\n\nOverall, EV market penetration correlated far more strongly with dense public charging infrastructure than with direct cash subsidies, with Norway leading markedly in both adoption and charger availability.\n\nNorway registered an overwhelming EV market share of 89% of all new passenger car registrations, supported by 420 fast chargers per 100,000 inhabitants, despite offering a modest tax credit equivalent to $2,100. China ranked second in both metrics, capturing 44% market share alongside 265 chargers per 100,000 people and a $3,200 subsidy.\n\nBy contrast, the United States offered the most generous federal purchase incentive at $7,500 per vehicle, yet achieved only a 14% EV market share due to a sparse charging network of 58 stations per 100,000 residents. Germany occupied a middle ground at 28% adoption and 145 chargers, whereas India recorded the lowest figures across all three indicators (4% share, 9 chargers, and $1,400 subsidy).',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_w1_8',
    module: 'Writing Task 1',
    topic: 'Health',
    subType: 'Line Graph',
    frequency: 'Practice Standard',
    title: 'Life Expectancy at Birth in Four World Regions (1960–2025)',
    prompt:
      'The line graph illustrates changes in average life expectancy at birth in East Asia, Western Europe, Latin America, and Sub-Saharan Africa between 1960 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    targetWordCount: '160–195 words',
    suggestedTimeMinutes: 20,
    examinerTips: [
      'Highlight the convergence of East Asia with Western Europe, and note the temporary dip in Sub-Saharan Africa during the 1990s before its recovery.'
    ],
    keyVocabulary: [
      { word: 'Longevity trajectory', meaning_bn: 'গড় আয়ু বৃদ্ধির দীর্ঘমেয়াদী গতিপথ' },
      { word: 'Converged with', meaning_bn: 'ব্যবধান কমিয়ে একই অবস্থানে মিলিত হওয়া' },
      { word: 'Steep upward climb', meaning_bn: 'দ্রুতগতিতে উপরের দিকে উত্থান' }
    ],
    modelAnswer:
      'The line graph tracks average life expectancy at birth across four global regions over a 65-year period from 1960 to 2025.\n\nOverall, longevity improved substantially across all four territories, with East Asia exhibiting the most dramatic upward climb to converge with Western Europe, while Sub-Saharan Africa remained the lowest throughout despite steady recent gains.\n\nIn 1960, Western Europe boasted the highest life expectancy at 70 years, significantly ahead of Latin America (56 years), East Asia (49 years), and Sub-Saharan Africa (41 years). Over the subsequent decades, Western Europe rose steadily to reach 83 years by 2025.\n\nMost notably, East Asia experienced an extraordinary surge between 1960 and 1990, vaulting from 49 to 71 years, and eventually reaching 81 years in 2025—virtually matching Western European standards. Latin America followed a consistent upward trajectory to finish at 76 years. Meanwhile, Sub-Saharan Africa climbed to 51 years by 1990, stagnated for a decade, and then resumed brisk growth from 2000 onward to attain 64 years in 2025.',
    modelBand: 'Band 9.0'
  },

  // =========================================================================
  // ADDITIONAL SPEAKING PART 1, 2 & 3 ITEMS
  // =========================================================================
  {
    id: 'qb_spk1_4',
    module: 'Speaking Part 1',
    topic: 'Education',
    subType: 'Part 1 Interview',
    frequency: 'High-Frequency',
    title: 'Foreign Languages, Dictionaries & Study Habits',
    prompt:
      '1. When did you first start learning a second language?\n2. What do you find most challenging about mastering English pronunciation?\n3. Do you prefer studying in absolute silence or with background music?',
    suggestedTimeMinutes: 4,
    examinerTips: [
      'Use linguistic terminology naturally ("stress-timed rhythm", "diphthongs", "ambient instrumental lo-fi").'
    ],
    keyVocabulary: [
      { word: 'Stress-timed rhythm', meaning_bn: 'বাক্যের নির্দিষ্ট শব্দে জোর দিয়ে কথা বলার ছন্দ' },
      { word: 'Phonetic nuance', meaning_bn: 'উচ্চারণের সূক্ষ্ম পার্থক্য' },
      { word: 'Ambient acoustics', meaning_bn: 'চারপাশের মৃদু ও প্রশান্ত শব্দতরঙ্গ' }
    ],
    modelAnswer:
      '1. I was first introduced to English in primary school around the age of six, though at that stage it revolved mostly around basic nursery rhymes and alphabet flashcards. My serious academic immersion began during my secondary school years.\n\n2. For me, the trickiest hurdle has always been internalizing the stress-timed rhythm and weak vowel reductions of British English. Because my native Bengali is largely syllable-timed, learning to elide unstressed syllables smoothly required deliberate shadowing practice.\n\n3. When I am drafting complex analytical essays, I require pin-drop silence. However, during routine vocabulary revision, I enjoy playing low-volume ambient classical piano to mask street noise.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_spk2_5',
    module: 'Speaking Part 2',
    topic: 'Urbanization',
    subType: 'Cue Card',
    frequency: 'Recent Real Exam',
    title: 'Describe an Impressive Public Building or Modern Structure',
    prompt:
      'Describe an architecturally striking public building, bridge, or monument that you have visited in person.',
    cueCardBulletPoints: [
      'What the structure is and where it is located',
      'What its exterior design and interior layout look like',
      'What public function the building serves',
      'And explain how visiting this architectural landmark made you feel'
    ],
    suggestedTimeMinutes: 3,
    examinerTips: [
      'Use architectural vocabulary ("brutalist concrete", "geometric apertures", "natural daylighting", "monumental scale").'
    ],
    keyVocabulary: [
      { word: 'Architectural masterpiece', meaning_bn: 'স্থাপত্যশিল্পের এক অনন্য নিদর্শন' },
      { word: 'Geometric symmetry', meaning_bn: 'জ্যামিতিক ভারসাম্য ও নান্দনিকতা' },
      { word: 'Spatial grandeur', meaning_bn: 'বিশাল ও রাজকীয় অভ্যন্তরীণ পরিসর' }
    ],
    modelAnswer:
      'I would like to describe the Jatiya Sangsad Bhaban—the National Parliament Complex in Dhaka—designed by the legendary twentieth-century architect Louis Kahn.\n\nSituated within a sprawling manicured expanse in Sher-e-Bangla Nagar, the edifice appears to rise out of an artificial reflective lake like an ancient citadel fused with modernist geometry. The facade is constructed from monolithic poured-in-place concrete inlaid with white marble bands, punctuated by colossal circular and triangular geometric apertures that allow natural breeze and diffused tropical sunlight to penetrate deep into the interior.\n\nFunctionally, the complex houses the unicameral legislative assembly chamber, ministerial offices, and parliamentary libraries, while its surrounding emerald lawns serve as a cherished recreational lung for thousands of city residents.\n\nStanding beneath its soaring octagonal rotunda last autumn left me utterly spellbound. The interplay of water, shadow, and monumental silence evokes a profound sense of civic dignity and timeless architectural poetry.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_spk3_4',
    module: 'Speaking Part 3',
    topic: 'Economy & Work',
    subType: 'In-Depth Discussion',
    frequency: 'Recent Real Exam',
    title: 'Gig Economy, Freelancing & Career Security',
    prompt:
      'Why are so many young professionals choosing freelance or gig-economy work over traditional lifelong corporate employment, and what are the long-term societal consequences of this shift?',
    suggestedTimeMinutes: 4,
    examinerTips: [
      'Weigh geographical and scheduling autonomy against the erosion of pension benefits, paid sick leave, and mortgage eligibility.'
    ],
    keyVocabulary: [
      { word: 'Autonomous scheduling', meaning_bn: 'নিজের সুবিধামতো কাজের সময় নির্ধারণের স্বাধীনতা' },
      { word: 'Precarious employment', meaning_bn: 'অনিশ্চিত ও ঝুঁকিপূর্ণ কর্মসংস্থান' },
      { word: 'Portable social security', meaning_bn: 'চাকরি পরিবর্তন করলেও বহনযোগ্য পেনশন ও বিমা সুবিধা' }
    ],
    modelAnswer:
      'The surge in digital freelancing and platform-based gig work reflects both an aspirational desire for autonomy and structural shifts in corporate hiring.\n\nYounger cohorts increasingly prize geographical independence and flexible scheduling over the rigid hierarchies of nine-to-five corporate ladders. A skilled software developer or graphic designer in Dhaka or Manila can now contract directly with clients in London or Zurich. However, from a macroeconomic perspective, this shift carries troubling implications for social security. Gig workers frequently inhabit a precarious legal gray zone devoid of employer-matched pensions, paid maternity leave, or collective bargaining rights. Unless labour ministries modernize employment law to mandate portable social insurance for independent contractors, society risks a crisis of elderly poverty in decades to come.',
    modelBand: 'Band 9.0'
  },

  // =========================================================================
  // ADDITIONAL READING & LISTENING MODULES
  // =========================================================================
  {
    id: 'qb_read_4',
    module: 'Reading',
    topic: 'Health',
    subType: 'Yes / No / Not Given (Writer’s Claims)',
    frequency: 'Recent Real Exam',
    title: 'Passage: Circadian Entrainment, Melanopsin & Artificial Blue Light',
    prompt:
      'READ THE PASSAGE EXCERPT & ANSWER QUESTIONS 1–4 (YES / NO / NOT GIVEN):\n\n[A] For millions of years, the mammalian suprachiasmatic nucleus (SCN)—the master circadian pacemaker located in the hypothalamus—synchronized internal metabolic clocks strictly to the solar rotation of the Earth. In the early 2000s, neurobiologists discovered a novel class of intrinsically photosensitive retinal ganglion cells (ipRGCs) containing the photopigment melanopsin. Unlike rod and cone photoreceptors responsible for conscious visual imagery, melanopsin cells project directly to the SCN and exhibit peak spectral sensitivity to short-wavelength blue light between 460 and 480 nanometers.\n\n[B] During daylight hours, exposure to blue-enriched solar radiation beneficially suppresses pineal melatonin secretion, elevating cortisol alertness and cognitive reaction speed. However, the proliferation of solid-state LED ambient lighting and backlit organic light-emitting diode (OLED) smartphones after dusk has created an evolutionary mismatch. Evening exposure to 470 nm screen emissions tricks the SCN into interpreting midnight as solar noon, delaying REM sleep architecture and impairing nocturnal glymphatic clearance of neurotoxic beta-amyloid proteins.\n\nQUESTIONS:\n1. Melanopsin-containing retinal ganglion cells are primarily responsible for forming conscious visual images. (YES / NO / NOT GIVEN)\n2. Exposure to short-wavelength blue light during the daytime has positive effects on human alertness. (YES / NO / NOT GIVEN)\n3. Amber-tinted blue-light blocking glasses completely restore normal melatonin secretion in night-shift workers. (YES / NO / NOT GIVEN)\n4. Evening smartphone use interferes with the brain’s nocturnal clearance of neurotoxic proteins. (YES / NO / NOT GIVEN)',
    suggestedTimeMinutes: 15,
    examinerTips: [
      'In YES / NO / NOT GIVEN, double-check whether your answer is YES/NO (never write TRUE/FALSE on the official sheet for YNNG!).'
    ],
    keyVocabulary: [
      { word: 'Circadian pacemaker', meaning_bn: 'মস্তিষ্কের দেহঘড়ি নিয়ন্ত্রণকারী কেন্দ্র' },
      { word: 'Evolutionary mismatch', meaning_bn: 'বিবর্তনীয় অভ্যাসের সাথে আধুনিক পরিবেশের অসামঞ্জস্য' },
      { word: 'Glymphatic clearance', meaning_bn: 'ঘুমের সময় মস্তিষ্কের বিষাক্ত বর্জ্য পরিষ্কার প্রক্রিয়া' }
    ],
    modelAnswer:
      'OFFICIAL ANSWER KEY & EXAMINER EVIDENCE:\n\n1. NO — Paragraph [A] explicitly contrasts melanopsin cells with rods and cones: "Unlike rod and cone photoreceptors responsible for conscious visual imagery, melanopsin cells project directly to the SCN..."\n\n2. YES — Paragraph [B] states: "During daylight hours, exposure to blue-enriched solar radiation beneficially suppresses pineal melatonin secretion, elevating cortisol alertness and cognitive reaction speed."\n\n3. NOT GIVEN — Neither paragraph mentions amber-tinted glasses or night-shift workers.\n\n4. YES — Paragraph [B] confirms that evening screen emissions delay REM sleep and impair "nocturnal glymphatic clearance of neurotoxic beta-amyloid proteins."',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_lis_4',
    module: 'Listening',
    topic: 'Urbanization',
    subType: 'Section 2 · Public Facility Map & Guide Briefing',
    frequency: 'Recent Real Exam',
    title: 'Redeveloped Millbrook Botanical Park Visitor Orientation',
    prompt:
      'READ THE SECTION 2 MONOLOGUE & ANSWER QUESTIONS 1–4:\n\nPark Ranger (Arthur): "Welcome everyone to the grand reopening of Millbrook Botanical Park. If you glance at the orientation map in your brochure, we are currently standing at the South Gate Entrance. Walking straight ahead along the main gravel avenue, the first glass structure on your left—directly opposite the ornamental swan pond—is our new Subtropical Fernery. If you continue north past the pond and cross the timber footbridge over the Mill Stream, the circular building in the far north-west corner is the Sensory Herb Garden, designed specifically with raisedbraille plaques for visually impaired visitors. Meanwhile, the old Victorian clockhouse in the north-east quadrant has been converted into an organicZero-Waste Tearoom. Finally, please note that bicycles are only permitted on the outer perimeter asphalt loop, not on the interior boardwalks."\n\nQUESTIONS:\n1. Which facility is located on the left of the main gravel avenue, opposite the swan pond?\n2. Where is the Sensory Herb Garden situated?\n3. What has the old Victorian clockhouse in the north-east quadrant been converted into?\n4. Where are visitors allowed to ride bicycles inside the park?',
    suggestedTimeMinutes: 10,
    examinerTips: [
      'In Section 2 Map Labelling, always anchor your pencil on the starting point ("South Gate Entrance") and trace compass directions ("north", "north-west corner", "north-east quadrant") step by step.'
    ],
    keyVocabulary: [
      { word: 'Ornamental pond', meaning_bn: 'সৌন্দর্যবর্ধক কৃত্রিম জলাশয়' },
      { word: 'North-east quadrant', meaning_bn: 'উত্তর-পূর্ব চতুর্থাংশ বা কোণ' },
      { word: 'Outer perimeter loop', meaning_bn: 'চারপাশের সীমানা ঘিরে থাকা চক্রাকার পথ' }
    ],
    modelAnswer:
      'OFFICIAL ANSWER KEY:\n\n1. The Subtropical Fernery\n2. In the far north-west corner (across the timber footbridge over the Mill Stream)\n3. An organic Zero-Waste Tearoom\n4. On the outer perimeter asphalt loop',
    modelBand: 'Band 9.0'
  },

  // =========================================================================
  // EXTENDED CAMBRIDGE REPOSITORY (WRITING, SPEAKING, READING & LISTENING)
  // =========================================================================
  {
    id: 'qb_w2_15',
    module: 'Writing Task 2',
    topic: 'Technology',
    subType: 'Agree / Disagree',
    frequency: 'Practice Standard',
    title: 'Autonomous Vehicles & Traffic Liability',
    prompt:
      'Self-driving cars and autonomous freight trucks will soon dominate public highways. Some believe this will virtually eliminate road fatalities, while others argue autonomous vehicles introduce unacceptable ethical and cybersecurity risks. To what extent do you agree or disagree?',
    targetWordCount: '260–310 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Contrast human driver fallibility (fatigue, intoxication, distraction) with algorithmic edge-cases and legal liability.'
    ],
    keyVocabulary: [
      { word: 'Human fallibility', meaning_bn: 'মানুষের ভুল করার স্বাভাবিক প্রবণতা' },
      { word: 'Algorithmic telemetry', meaning_bn: 'স্বয়ংক্রিয় সেন্সর ও কম্পিউটারের মাধ্যমে গতিপথ নিয়ন্ত্রণ' },
      { word: 'Legal culpability', meaning_bn: 'আইনি দায়বদ্ধতা বা অপরাধের দায়' }
    ],
    modelAnswer:
      'The imminent transition from human-operated automobiles to autonomous vehicular fleets represents a watershed moment in transportation engineering. While critics raise valid alarms regarding algorithmic edge-cases and cyber vulnerabilities, I strongly agree that self-driving technology will overwhelmingly enhance public road safety.\n\nStatistical audits from the World Health Organization indicate that over ninety percent of vehicular collisions stem from human fallibility—specifically exhaustion, intoxication, speeding, and smartphone distraction. Autonomous vehicles equipped with 360-degree LiDAR arrays, radar, and millisecond braking reflexes neither fatigue nor succumb to road rage. By synchronizing highway speeds and platooning freight trucks, automated transit can eradicate the vast majority of fatal highway pile-ups.\n\nAdmittedly, legislative frameworks must evolve to resolve complex questions of legal culpability when an autonomous sensor malfunctions during severe blizzards, and manufacturers must air-gap steering firmware against remote hacking. Yet these engineering challenges are surmountable through rigorous aviation-grade certification. In conclusion, the life-saving dividends of removing human error from highways far eclipse the transitional regulatory complexities.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_w2_16',
    module: 'Writing Task 2',
    topic: 'Environment',
    subType: 'Problem & Solution',
    frequency: 'Recent Real Exam',
    title: 'Fast Fashion & Textile Landfill Pollution',
    prompt:
      'The "fast fashion" industry produces billions of cheap garments every year, resulting in massive textile waste and river pollution in developing nations. What are the causes of this problem, and how can governments and consumers make the clothing industry sustainable?',
    targetWordCount: '260–320 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Identify synthetic polyester microfibers and influencer-driven micro-trends as causes; propose circular textile mandates and conscious consumerism as solutions.'
    ],
    keyVocabulary: [
      { word: 'Planned obsolescence', meaning_bn: 'অল্প দিনেই নষ্ট বা সেকেলে হয়ে যাওয়ার পরিকল্পিত কৌশল' },
      { word: 'Circular textile economy', meaning_bn: 'পোশাক পুনর্ব্যবহার ও রিসাইক্লিংভিত্তিক অর্থনীতি' },
      { word: 'Synthetic microfibers', meaning_bn: 'কৃত্রিম তন্তুর অতিক্ষুদ্র কণা' }
    ],
    modelAnswer:
      'The contemporary apparel sector has abandoned seasonal durability in favor of hyper-accelerated "fast fashion," generating an ecological crisis across global waterways and landfills. This phenomenon is fueled by algorithmic social media trends and synthetic fabric economics, but it can be curtailed through statutory producer responsibility and mindful consumption.\n\nThe primary driver of textile waste is the business model of planned aesthetic obsolescence. Apparel conglomerates release fifty-two "micro-seasons" annually, utilizing ultra-cheap petrochemical polyester blends that degrade after a few washes. Simultaneously, social media haul culture pressures adolescents to treat garments as single-wear props, dumping millions of tons of toxic dyed fabrics into landfills and rivers across the Global South.\n\nAddressing this crisis requires a dual intervention. Governments should enact Extended Producer Responsibility (EPR) legislation that taxes virgin synthetic fibers and legally obligates fashion brands to fund garment collection and fiber-to-fiber recycling plants. Concurrently, consumers must pivot toward a "capsule wardrobe" ethos, prioritizing durable organic textiles and second-hand thrift exchanges. In conclusion, regulatory taxation paired with consumer restraint is essential to detoxify the global apparel supply chain.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_w1_9',
    module: 'Writing Task 1',
    topic: 'Environment',
    subType: 'Process Diagram',
    frequency: 'Practice Standard',
    title: 'Geothermal Power Plant Electricity Generation',
    prompt:
      'The diagram below shows how geothermal energy is used to produce electricity in a binary-cycle geothermal power station. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    targetWordCount: '160–195 words',
    suggestedTimeMinutes: 20,
    examinerTips: [
      'Highlight the closed-loop cyclical nature of the subterranean water injection and extraction in your Overview.'
    ],
    keyVocabulary: [
      { word: 'Subterranean reservoir', meaning_bn: 'ভূগর্ভস্থ উত্তপ্ত পানির আধার' },
      { word: 'Condensation tower', meaning_bn: 'বাষ্পকে পুনরায় তরলে রূপান্তর করার স্তম্ভ' },
      { word: 'Closed-loop cycle', meaning_bn: 'বদ্ধ ও চক্রাকার আবর্তন প্রক্রিয়া' }
    ],
    modelAnswer:
      'The schematic diagram illustrates the operational mechanism of a geothermal power station that harnesses subterranean heat to generate electrical power.\n\nOverall, the process functions as a continuous five-stage closed-loop cycle, comprising cold water injection, geothermal heating through fractured bedrock, steam extraction, turbine-driven electromagnetic generation, and condensation.\n\nIn the initial stage, cold surface water is pumped downward through a vertical injection well to a depth of approximately 4.5 kilometers beneath the Earth’s crust. At the bottom of the well, the pressurized water percolates horizontally through a "geothermal zone" of superheated permeable granite rocks, raising the fluid temperature above 200°C.\n\nSubsequently, this superheated water is drawn upward via a parallel production well into a surface separator unit, where rapid depressurization flashes the liquid into high-velocity steam. The steam propels a rotary turbine connected to an electrical generator, which feeds high-voltage alternating current into the national transmission grid. Finally, the exhausted steam passes into a cooling tower, condenses back into liquid water, and is channeled back to the injection well to repeat the cycle.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_w1_10',
    module: 'Writing Task 1',
    topic: 'Urbanization',
    subType: 'Bar Chart',
    frequency: 'Recent Real Exam',
    title: 'Daily Commuter Transport Modes in Five World Cities (2025)',
    prompt:
      'The bar chart shows the percentage of daily commuters using three modes of transport (Public Transit, Private Car, and Cycling/Walking) in Tokyo, Amsterdam, London, New York, and Los Angeles in 2025. Summarise the information and make comparisons where relevant.',
    targetWordCount: '160–195 words',
    suggestedTimeMinutes: 20,
    examinerTips: [
      'Group the cities by their dominant mobility paradigm: Tokyo/London/NY (Public Transit), Amsterdam (Active Cycling/Walking), and Los Angeles (Private Automobile).'
    ],
    keyVocabulary: [
      { word: 'Active mobility', meaning_bn: 'সাইকেল চালানো বা হাঁটার মতো শারীরিক পরিবহন মাধ্যম' },
      { word: 'Automobile dependency', meaning_bn: 'ব্যক্তিগত গাড়ির ওপর অতিরিক্ত নির্ভরশীলতা' },
      { word: 'Mass-transit hegemony', meaning_bn: 'গণপরিবহনের একচ্ছত্র প্রাধান্য' }
    ],
    modelAnswer:
      'The bar chart compares the modal split of daily commuters across three transport categories—public transit, private automobiles, and active mobility (cycling or walking)—in five major metropolises in 2025.\n\nOverall, commuting patterns varied dramatically by urban design: Tokyo and London were heavily dominated by public transit, Amsterdam led the cohort in cycling and walking, and Los Angeles exhibited extreme dependency on private cars.\n\nIn Tokyo, an overwhelming 71% of commuters relied on rail and bus networks, while only 11% drove private cars and 18% walked or cycled. London and New York displayed similar transit-oriented profiles, with public transport capturing 56% and 52% of daily trips respectively.\n\nConversely, Amsterdam stood out as the global capital of active mobility, where 54% of residents commuted by bicycle or on foot, leaving 28% for public transit and just 18% for private cars. At the opposite extreme, Los Angeles was overwhelmingly car-centric, with 78% of commuters driving solo, compared to a meager 13% utilizing public transit and 9% walking or cycling.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_read_5',
    module: 'Reading',
    topic: 'Society & Culture',
    subType: 'True / False / Not Given & Summary',
    frequency: 'Practice Standard',
    title: 'Passage: The Phoenician Abjad & The Democratization of Literacy',
    prompt:
      'READ THE PASSAGE EXCERPT & ANSWER QUESTIONS 1–4:\n\n[A] Throughout the Bronze Age, literacy in the Near East was the exclusive monopoly of royal palace scribes trained in Mesopotamian cuneiform or Egyptian hieroglyphs. Mastering either script required memorizing over six hundred logographic and syllabic signs—a decade-long apprenticeship that tethered writing strictly to state taxation and temple bureaucracy.\n\n[B] Around 1050 BCE, seafaring Canaanite merchants inhabiting the Levantine ports of Byblos, Tyre, and Sidon engineered a radical semiotic breakthrough: the Phoenician abjad. Rather than depicting whole words or complex syllables, the Phoenician script distilled spoken language into twenty-two consonantal phonemes based on the acrophonic principle (where the pictograph for "beth" or house stood solely for the initial /b/ sound). Because a maritime trader could memorize twenty-two letters in a single week without formal priestly schooling, functional literacy rapidly diffused across Mediterranean commercial networks, directly seeding the Archaic Greek, Aramaic, and Latin alphabets.\n\nQUESTIONS:\n1. Bronze Age cuneiform and hieroglyphic scripts could be mastered by ordinary merchants within a few weeks. (TRUE / FALSE / NOT GIVEN)\n2. The Phoenician script consisted of twenty-two signs representing consonantal sounds. (TRUE / FALSE / NOT GIVEN)\n3. Phoenician women were the primary teachers of the alphabet in Byblos and Sidon. (TRUE / FALSE / NOT GIVEN)\n4. Both the Greek and Latin alphabets trace their lineage back to the Phoenician script. (TRUE / FALSE / NOT GIVEN)',
    suggestedTimeMinutes: 14,
    examinerTips: [
      'Verify historical numbers and script characteristics carefully between Paragraphs A and B.'
    ],
    keyVocabulary: [
      { word: 'Exclusive monopoly', meaning_bn: 'একচ্ছত্র আধিপত্য বা অধিকার' },
      { word: 'Semiotic breakthrough', meaning_bn: 'লিখনপদ্ধতি বা চিহ্নের যুগান্তকারী উদ্ভাবন' },
      { word: 'Consonantal phonemes', meaning_bn: 'ব্যঞ্জনধ্বনিমূলক বর্ণমালা' }
    ],
    modelAnswer:
      'OFFICIAL ANSWER KEY & EXAMINER EVIDENCE:\n\n1. FALSE — Paragraph [A] states that cuneiform and hieroglyphs required memorizing over 600 signs in "a decade-long apprenticeship" restricted to royal palace scribes.\n\n2. TRUE — Paragraph [B] confirms the Phoenician abjad distilled language into "twenty-two consonantal phonemes."\n\n3. NOT GIVEN — Paragraph [B] mentions maritime traders in Byblos, Tyre, and Sidon, but provides no information about women teaching the script.\n\n4. TRUE — Paragraph [B] explicitly notes that the Phoenician script directly seeded "the Archaic Greek, Aramaic, and Latin alphabets."',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_lis_5',
    module: 'Listening',
    topic: 'Health',
    subType: 'Section 4 · University Lecture Summary',
    frequency: 'Recent Real Exam',
    title: 'Bacteriophage Therapy & Antibiotic-Resistant Superbugs',
    prompt:
      'COMPLETE THE LECTURE NOTES BELOW (ONE WORD ONLY):\n\nTranscript Excerpt (Prof. Eleanor Vance): "Welcome to the Department of Microbiology. Today we examine how 21st-century medicine is reviving a century-old biological weapon—bacteriophages—to combat multidrug-resistant bacterial superbugs. Unlike broad-spectrum chemical antibiotics, which indiscriminately wipe out beneficial gut flora alongside pathogens, a bacteriophage is a virus that targets a single specific bacterial species. The phage attaches its tail fibers to protein receptors on the bacterium’s outer membrane and injects its viral DNA. Within thirty minutes, the hijacked cell synthesizes hundreds of new phages and produces an enzyme called endolysin, which ruptures the bacterial cell wall from within. Furthermore, phages are self-amplifying: they multiply exponentially at the exact site of infection and are naturally cleared by the patient’s spleen once the target bacteria are eradicated. However, a key clinical hurdle is that human antibodies may neutralize phages during repeated intravenous infusions."\n\nCOMPLETE NOTES:\n1. Broad-spectrum antibiotics destroy beneficial gut ________ as well as harmful pathogens.\n2. Bacteriophages release an enzyme named ________ to burst the bacterial cell wall.\n3. Once all host bacteria are destroyed, leftover phages are removed by the human ________.\n4. During repeated treatments, the patient’s own ________ might neutralize the phages.',
    suggestedTimeMinutes: 10,
    examinerTips: [
      'Listen for scientific definitions ("an enzyme called endolysin") and anatomical nouns ("spleen", "antibodies").'
    ],
    keyVocabulary: [
      { word: 'Broad-spectrum antibiotic', meaning_bn: 'বহু ধরনের ব্যাকটেরিয়ার বিরুদ্ধে কাজ করা অ্যান্টিবায়োটিক' },
      { word: 'Indiscriminately wipe out', meaning_bn: 'ভালো-মন্দ বিচার না করে নির্বিচারে ধ্বংস করা' },
      { word: 'Self-amplifying', meaning_bn: 'স্বয়ংক্রিয়ভাবে নিজের সংখ্যা বৃদ্ধি করতে সক্ষম' }
    ],
    modelAnswer:
      'OFFICIAL ANSWER KEY:\n\n1. FLORA\n2. ENDOLYSIN\n3. SPLEEN\n4. ANTIBODIES',
    modelBand: 'Band 9.0'
  }
];

// Additional 42 authentic IELTS items across all 7 modules (Writing Task 1 & 2, Speaking Parts 1-3, Reading, Listening)
const ADDITIONAL_CAMBRIDGE_QB_ITEMS: QuestionBankItem[] = [
  // Writing Task 2
  {
    id: 'qb_w2_17',
    module: 'Writing Task 2',
    topic: 'Education',
    subType: 'Discuss Both Views',
    frequency: 'Practice Standard',
    title: 'Single-Sex Schools vs Co-Educational Academies',
    prompt:
      'Some parents prefer to send their children to single-sex schools, while others believe that co-educational (mixed-gender) schools better prepare students for adult society. Discuss both views and give your opinion.',
    targetWordCount: '260–310 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Evaluate academic focus and reduced gender-stereotyping of subjects in single-sex schools against the real-world socialization of co-ed environments.'
    ],
    keyVocabulary: [
      { word: 'Co-educational environment', meaning_bn: 'ছেলে ও মেয়েদের একত্রে সহশিক্ষার পরিবেশ' },
      { word: 'Interpersonal socialization', meaning_bn: 'পারস্পরিক মেলামেশা ও সামাজিকীকরণের দক্ষতা' },
      { word: 'Gender stereotyping', meaning_bn: 'লিঙ্গভিত্তিক প্রচলিত সংস্কার বা ধারণা' }
    ],
    modelAnswer:
      'The debate between single-sex schooling and co-educational academies centers on whether academic instruction should be insulated from adolescent social dynamics or integrated within them. While single-gender institutions occasionally mitigate peer distraction, I firmly believe that co-educational schools offer a far more holistic preparation for modern civic and professional life.\n\nProponents of single-sex education argue that separating boys and girls during adolescence reduces social self-consciousness and allows teachers to tailor pedagogical pacing. Furthermore, research suggests that girls in all-female classrooms often feel less inhibited when pursuing traditionally male-dominated STEM disciplines such as physics and computer engineering.\n\nConversely, the adult workplace, university seminar rooms, and civic institutions are inherently mixed-gender environments. Isolating adolescents during their formative developmental years deprives them of daily opportunities to cultivate mutual respect, collaborative communication, and emotional intelligence across gender lines. Graduates of segregated institutions frequently experience awkward adjustment phases when integrating into corporate teams. In conclusion, co-educational schooling—supplemented by active faculty mentorship to dismantle subject stereotypes—remains the superior educational model.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_w2_18',
    module: 'Writing Task 2',
    topic: 'Society & Culture',
    subType: 'Agree / Disagree',
    frequency: 'High-Frequency',
    title: 'Museum Repatriation of Historical Artifacts',
    prompt:
      'Many world-famous museums display historical artifacts and treasures that were taken from other countries during colonial eras. Some people believe these artifacts should be returned to their countries of origin, while others argue they are safer and seen by more people in major international museums. To what extent do you agree or disagree?',
    targetWordCount: '260–320 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Address the "universal museum" preservation argument before making a nuanced case for digital 3D replication and legal repatriation.'
    ],
    keyVocabulary: [
      { word: 'Cultural repatriation', meaning_bn: 'লুণ্ঠিত ঐতিহাসিক নিদর্শন নিজ দেশে ফিরিয়ে দেওয়া' },
      { word: 'Colonial provenance', meaning_bn: 'ঔপনিবেশিক আমলে সংগৃহীত উৎস বা ইতিহাস' },
      { word: 'Curatorial stewardship', meaning_bn: 'জাদুঘরের নিদর্শন রক্ষণাবেক্ষণের দায়িত্ব' }
    ],
    modelAnswer:
      'Western encyclopedic museums—such as the British Museum and the Louvre—house thousands of priceless antiquities acquired under dubious colonial circumstances. While curators contend that cosmopolitan capitals offer superior conservation and global visibility, I strongly agree that artifacts of contested colonial provenance ought to be repatriated to their ancestral homelands.\n\nDefenders of the status quo assert that encyclopedic museums function as universal archives where visitors can compare human civilizations under one roof, protected by state-of-the-art climate control. However, this justification has become increasingly anachronistic; modern museums in Cairo, Athens, Lagos, and Delhi now possess world-class curatorial stewardship and security infrastructure.\n\nMore fundamentally, cultural artifacts are not mere aesthetic commodities; they are the severed pillars of a nation’s historical memory and spiritual identity. Retaining looted bronzes or temple friezes perpetuates historical injustice. With high-resolution laser scanning and 3D fabrication, Western galleries can display indistinguishable replicas for educational comparison while returning the authentic masterpieces to their rightful custodians. In conclusion, ethical integrity demands the systematic repatriation of colonial-era treasures.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_w2_19',
    module: 'Writing Task 2',
    topic: 'Economy & Work',
    subType: 'Problem & Solution',
    frequency: 'Recent Real Exam',
    title: 'Aging Populations & Declining Birth Rates',
    prompt:
      'In many developed and developing nations, birth rates are falling rapidly while the proportion of elderly citizens is reaching record highs. What problems will this demographic shift cause for society, and what measures can governments take to address it?',
    targetWordCount: '260–320 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Highlight the shrinking tax base and geriatric healthcare strain in Body 1; propose pronatalist childcare subsidies, pension reform, and skilled immigration in Body 2.'
    ],
    keyVocabulary: [
      { word: 'Demographic inversion', meaning_bn: 'তরুণদের তুলনায় প্রবীণ জনগোষ্ঠীর অনুপাত বেড়ে যাওয়া' },
      { word: 'Old-age dependency ratio', meaning_bn: 'কর্মক্ষম মানুষের বিপরীতে নির্ভরশীল প্রবীণদের হার' },
      { word: 'Pronatalist incentives', meaning_bn: 'সন্তান জন্মদানে উৎসাহিত করার রাষ্ট্রীয় সুবিধা' }
    ],
    modelAnswer:
      'Across East Asia, Europe, and parts of the Americas, sub-replacement fertility rates combined with rising longevity have triggered an unprecedented demographic inversion. This trajectory threatens to bankrupt sovereign pension funds and paralyze labor markets, requiring a multifaceted policy response.\n\nThe foremost consequence of a graying populace is the surging old-age dependency ratio. As the cohort of working-age taxpayers contracts, a dwindling pool of young earners must finance escalating state pensions and geriatric long-term care. Simultaneously, acute labor shortages in manufacturing, nursing, and engineering stifle macroeconomic innovation and GDP growth.\n\nTo mitigate this demographic winter, governments must first alleviate the financial penalties of parenthood by providing universal subsidized childcare, statutory paid parental leave for both parents, and affordable family housing. Secondly, states should gradually index retirement thresholds to healthy life expectancy while encouraging flexible part-time consultancy for active seniors. Finally, selective points-based immigration pathways can replenish vital workforce sectors. In conclusion, combining family-friendly welfare with pension modernization is essential to stabilize aging societies.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_w2_20',
    module: 'Writing Task 2',
    topic: 'Environment',
    subType: 'Agree / Disagree',
    frequency: 'Practice Standard',
    title: 'International Air Travel Taxes & Eco-Tourism',
    prompt:
      'Commercial aviation is a rapidly growing source of greenhouse gas emissions. Some environmentalists argue that governments should impose heavy carbon taxes on airline tickets to discourage non-essential leisure flights. To what extent do you agree or disagree?',
    targetWordCount: '260–310 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Propose a progressive "frequent-flyer levy" and Sustainable Aviation Fuel (SAF) R&D rather than flat ticket taxes that hurt working-class families and tourism-dependent nations.'
    ],
    keyVocabulary: [
      { word: 'Progressive frequent-flyer levy', meaning_bn: 'অতিরিক্ত বিমান ভ্রমণকারীদের ওপর ক্রমবর্ধমান কর' },
      { word: 'Sustainable aviation fuel', meaning_bn: 'পরিবেশবান্ধব জৈব বিমান জ্বালানি' },
      { word: 'Regressive taxation', meaning_bn: 'স্বল্প আয়ের মানুষের ওপর বেশি চাপ সৃষ্টি করা কর' }
    ],
    modelAnswer:
      'With commercial aviation accounting for a growing share of radiative climate forcing, environmental advocates have proposed punitive carbon levies on passenger airfares. While I agree that aviation emissions must be curbed, I disagree with flat ticket surcharges that penalize ordinary families; instead, governments should enact progressive frequent-flyer taxes and mandate sustainable aviation fuels.\n\nA uniform excise duty on economy-class tickets is inherently regressive. Wealthy executives and luxury tourists would absorb a hundred-dollar surcharge effortlessly, whereas working-class immigrants visiting overseas relatives once every few years would be priced out of the skies. Furthermore, developing island nations in the Caribbean and South Asia rely heavily on international tourism for foreign exchange and hospitality employment.\n\nA far more equitable mechanism is a progressive frequent-flyer levy: each citizen’s first annual return flight remains untaxed, while taxes escalate exponentially on third, fourth, and private-jet voyages. Revenues from this levy should be ring-fenced to subsidize high-speed transnational rail corridors and synthetic Sustainable Aviation Fuel (SAF) refineries. In conclusion, targeting hyper-mobile elites and accelerating green fuel innovation is superior to blanket airfare taxation.',
    modelBand: 'Band 9.0'
  },

  // Writing Task 1
  {
    id: 'qb_w1_11',
    module: 'Writing Task 1',
    topic: 'Education',
    subType: 'Bar Chart',
    frequency: 'Practice Standard',
    title: 'International Student Enrollment in Four Host Countries (2015 vs 2025)',
    prompt:
      'The bar chart compares the total number of international university students (in thousands) enrolled in the United States, the United Kingdom, Australia, and Canada in 2015 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    targetWordCount: '160–195 words',
    suggestedTimeMinutes: 20,
    examinerTips: [
      'Highlight both absolute rank order (US first throughout) and proportional rate of growth (Canada more than doubling).'
    ],
    keyVocabulary: [
      { word: 'Retained its pole position', meaning_bn: 'শীর্ষস্থান ধরে রেখেছিল' },
      { word: 'More than doubled', meaning_bn: 'দ্বিগুণেরও বেশি বৃদ্ধি পেয়েছিল' },
      { word: 'Proportional expansion', meaning_bn: 'আনুপাতিক হারে প্রসার' }
    ],
    modelAnswer:
      'The bar chart illustrates the volume of foreign tertiary students—measured in thousands—studying in four major English-speaking destinations in 2015 and 2025.\n\nOverall, international student enrollment expanded across all four host nations over the decade. While the United States retained its pole position in absolute numbers, Canada and Australia registered the most rapid proportional rates of growth.\n\nIn 2015, the United States hosted 910,000 overseas students, nearly double the figure of its closest competitor, the United Kingdom (495,000). By 2025, US enrollment had risen moderately by roughly 18% to reach 1,075,000, whereas UK figures climbed more briskly to 680,000.\n\nThe most striking transformation occurred in Canada and Australia. Starting from the lowest baseline of 340,000 students in 2015, Canadian international enrollment more than doubled over the ten-year period to hit 720,000 in 2025, overtaking the United Kingdom to claim second place overall. Similarly, Australia experienced a robust surge from 380,000 to 640,000 students, narrowing the gap with Britain.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_w1_12',
    module: 'Writing Task 1',
    topic: 'Urbanization',
    subType: 'General Training Semi-Formal Letter',
    frequency: 'High-Frequency',
    title: 'Letter to Municipal Council Regarding Neighborhood Park Lighting',
    prompt:
      'The public park in your neighborhood has poor lighting in the evenings, making it unsafe for residents who walk or jog after work. Write a letter to your local municipal council. In your letter:\n- describe how residents use the park and what the problem is\n- explain an incident or risk caused by the poor lighting\n- suggest specific improvements the council should make.',
    targetWordCount: '155–190 words',
    suggestedTimeMinutes: 20,
    examinerTips: [
      'Use a formal/civic salutation ("Dear Sir or Madam," or "Dear Parks and Recreation Committee,") and maintain a constructive, persuasive tone.'
    ],
    keyVocabulary: [
      { word: 'Solar-powered LED bollards', meaning_bn: 'সৌরবিদ্যুৎ চালিত এলইডি ল্যাম্পপোস্ট' },
      { word: 'Pedestrian visibility', meaning_bn: 'পথচারীদের চলাচলের জন্য পর্যাপ্ত আলো ও দৃশ্যমানতা' },
      { word: 'Civic amenity', meaning_bn: 'নাগরিক সুবিধার স্থান' }
    ],
    modelAnswer:
      'Dear Parks and Recreation Director,\n\nI am writing on behalf of the Oakridge Residents’ Association to draw your urgent attention to the inadequate illumination along the perimeter footpaths of Oakridge Municipal Park.\n\nOur neighborhood park is a vital civic amenity utilized daily by hundreds of commuters walking home from the metro station, as well as evening joggers and elderly residents. Regrettably, six of the ten halogen streetlamps along the northern woodland trail have been non-functional since November, plunging a 400-meter stretch into near-total darkness after 5:30 PM.\n\nLast Tuesday evening, an elderly neighbor tripped over an unlit tree root protruding across the asphalt path and sustained a fractured wrist. Beyond physical tripping hazards, the pitch-black alcoves deter female commuters from crossing the park after dusk.\n\nWe respectfully urge the council to replace the defunct fixtures with energy-efficient, motion-activated solar LED lamps and to trim the overhanging boughs obstructing the eastern entrance lights. We look forward to your prompt intervention.\n\nYours faithfully,\nDr. Ariful Haque',
    modelBand: 'Band 9.0'
  },

  // Speaking Part 1, 2 & 3
  {
    id: 'qb_spk1_5',
    module: 'Speaking Part 1',
    topic: 'Society & Culture',
    subType: 'Part 1 Interview',
    frequency: 'Recent Real Exam',
    title: 'Art Galleries, Photography & Creative Hobbies',
    prompt:
      '1. Did you enjoy art or drawing classes when you were at primary school?\n2. Do you prefer taking photographs with your smartphone or simply enjoying the moment without a camera?\n3. What kind of visual art or photography would you hang on the walls of your home?',
    suggestedTimeMinutes: 4,
    examinerTips: [
      'Show range of aesthetic adjectives ("monochromatic street photography", "watercolour landscapes", "candid moments").'
    ],
    keyVocabulary: [
      { word: 'Candid photography', meaning_bn: 'না জানিয়ে তোলা স্বাভাবিক ও প্রাণবন্ত ছবি' },
      { word: 'Monochromatic aesthetic', meaning_bn: 'সাদাকালো বা একরঙা নান্দনিক শিল্পরূপ' },
      { word: 'Tactile medium', meaning_bn: 'হাতে ছুঁয়ে কাজ করার মতো শিল্পমাধ্যম' }
    ],
    modelAnswer:
      '1. Immensely! Back in primary school, Wednesday afternoon watercolour sessions were the highlight of my week because they offered a liberating break from rote arithmetic drills.\n\n2. I try to strike a conscious balance. When witnessing a breathtaking Himalayan sunrise, I snap one or two quick frames to preserve the memory, and then immediately pocket my phone so I can absorb the atmosphere with my own eyes rather than through a glass viewfinder.\n\n3. I have a strong affinity for high-contrast monochromatic street photography and traditional Bengali woodblock prints, as they lend warmth and historical character to minimalist white walls.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_spk2_6',
    module: 'Speaking Part 2',
    topic: 'Health',
    subType: 'Cue Card',
    frequency: 'Recent Real Exam',
    title: 'Describe a Positive Lifestyle Change You Made to Improve Your Health',
    prompt:
      'Describe a healthy habit, fitness routine, or dietary adjustment you adopted that improved your daily energy and well-being.',
    cueCardBulletPoints: [
      'What the healthy change was and when you started it',
      'What prompted or motivated you to make this adjustment',
      'What difficulties you encountered while forming the habit',
      'And explain how this change positively impacted your physical and mental performance'
    ],
    suggestedTimeMinutes: 3,
    examinerTips: [
      'Contrast your "before" state (lethargy, afternoon slump) with your "after" state (sustained mental acuity, restorative sleep).'
    ],
    keyVocabulary: [
      { word: 'Post-prandial lethargy', meaning_bn: 'দুপুরের খাবারের পর শরীরের ক্লান্তি ও ঝিমুনি ভাব' },
      { word: 'Metabolic stamina', meaning_bn: 'শারীরিক ও বিপাকীয় কর্মশক্তি' },
      { word: 'Habit stacking', meaning_bn: 'একটি অভ্যাসের সাথে আরেকটি ভালো অভ্যাস যুক্ত করা' }
    ],
    modelAnswer:
      'One of the most transformative lifestyle adjustments I ever implemented was eliminating refined sugars on weekdays and pairing that with a thirty-minute morning calisthenics routine.\n\nI initiated this overhaul roughly fourteen months ago during a demanding period of university research. At the time, I was relying heavily on sweetened iced coffees and pastries to power through late-night coding sessions, which inevitably triggered severe post-prandial lethargy every afternoon.\n\nThe first ten days were surprisingly grueling; I experienced mild caffeine-and-sugar withdrawal headaches, and waking up at 6:00 AM required immense willpower. To overcome this friction, I used a behavioral psychology technique called "habit stacking"—laying out my running shoes beside my bed the night before and tracking my streak on a wall calendar.\n\nWithin a month, the dividends were unmistakable. My afternoon brain fog vanished completely, my resting heart rate dropped, and my nighttime sleep became deeply restorative. It taught me that cognitive productivity is fundamentally anchored in physiological discipline.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_spk3_5',
    module: 'Speaking Part 3',
    topic: 'Technology',
    subType: 'In-Depth Discussion',
    frequency: 'High-Frequency',
    title: 'Deepfakes, Algorithmic Misinformation & Media Trust',
    prompt:
      'As synthetic AI-generated videos and "deepfakes" become indistinguishable from reality, how can democratic societies protect public trust in journalism and legal evidence?',
    suggestedTimeMinutes: 4,
    examinerTips: [
      'Propose both technical solutions (cryptographic watermarking at camera capture) and educational solutions (epistemic skepticism in schools).'
    ],
    keyVocabulary: [
      { word: 'Cryptographic provenance', meaning_bn: 'ডিজিটাল ফাইল বা ছবির আসল উৎস প্রমাণের প্রযুক্তি' },
      { word: 'Epistemic skepticism', meaning_bn: 'তথ্যের সত্যতা যাচাই করার যৌক্তিক ও অনুসন্ধিৎসু মনোভাব' },
      { word: 'Synthetic disinformation', meaning_bn: 'কৃত্রিম বুদ্ধিমত্তা দিয়ে তৈরি ভুয়া ও বিভ্রান্তিকর তথ্য' }
    ],
    modelAnswer:
      'The proliferation of hyper-realistic synthetic media poses an existential challenge to evidentiary truth, necessitating a dual defense of cryptographic authentication and civic media literacy.\n\nOn the technological front, camera hardware manufacturers and news agencies must adopt cryptographic provenance standards—such as the C2PA protocol—which embed tamper-evident digital signatures into photographs and audio files at the exact millisecond of sensor capture. Conversely, social media platforms should be legally required to label synthetic AI outputs.\n\nSimultaneously, citizens must cultivate healthy epistemic skepticism. Rather than accepting viral video clips at face value, the public must learn to cross-reference primary institutional sources. Ultimately, safeguarding democratic trust will depend on combining hardware verification with a more discerning electorate.',
    modelBand: 'Band 9.0'
  },

  // Reading & Listening
  {
    id: 'qb_read_6',
    module: 'Reading',
    topic: 'Economy & Work',
    subType: 'Multiple Choice & Sentence Completion',
    frequency: 'Recent Real Exam',
    title: 'Passage: The Tulip Mania of 1637 & Behavioral Asset Bubbles',
    prompt:
      'READ THE PASSAGE EXCERPT & ANSWER QUESTIONS 1–4:\n\n[A] During the Dutch Golden Age of the early seventeenth century, the United Provinces boasted the world’s most sophisticated maritime trade network and the Amsterdam Wisselbank. Amidst this commercial affluence emerged history’s most cited speculative frenzy: the Tulip Mania of 1636–1637. Newly imported from the Ottoman Empire, the bulbous perennial Tulipa captivated Dutch burghers. Particularly prized were "broken" bulbs—tulips whose petals displayed flamboyant, flame-like streaks of crimson and ivory. Unbeknownst to seventeenth-century horticulturists, these prized patterns were actually caused by a mosaic potyvirus transmitted by peach-potato aphids, which simultaneously weakened the bulb’s reproductive vigor.\n\n[B] Because infected bulbs could not be propagated rapidly from seed and required seven years of cultivation, supply was acutely inelastic. By winter 1636, trading shifted from physical botanical deliveries to formal futures contracts traded in Haarlem taverns. At the zenith of the bubble in February 1637, a single bulb of the rare Semper Augustus variety commanded a price equivalent to a grand canal-side merchant townhouse in Amsterdam. Days later, when routine buyers failed to bid at a Haarlem auction, panic cascaded across the futures market, evaporating paper fortunes overnight.\n\nQUESTIONS:\n1. From which empire was the tulip originally imported into the Netherlands?\n2. What biological agent actually caused the prized flame-like streaks on "broken" tulip petals?\n3. Why was the supply of broken tulip bulbs so inelastic?\n4. Which specific tulip variety reached a price equivalent to an Amsterdam townhouse in February 1637?',
    suggestedTimeMinutes: 14,
    examinerTips: [
      'Scan for historical dates (1636, February 1637) and italicized Latin names (Tulipa, Semper Augustus).'
    ],
    keyVocabulary: [
      { word: 'Speculative frenzy', meaning_bn: 'অতি-মুনাফার আশায় অযৌক্তিক বিনিয়োগের উন্মাদনা' },
      { word: 'Inelastic supply', meaning_bn: 'চাহিদা বাড়লেও সহজে সরবরাহ বাড়ানো যায় না এমন অবস্থা' },
      { word: 'Futures contracts', meaning_bn: 'ভবিষ্যতে নির্দিষ্ট মূল্যে পণ্য কেনাবেচার আগাম চুক্তি' }
    ],
    modelAnswer:
      'OFFICIAL ANSWER KEY:\n\n1. The Ottoman Empire (Paragraph A)\n2. A mosaic potyvirus (transmitted by peach-potato aphids) (Paragraph A)\n3. Because the virus weakened the bulb and they required seven years of cultivation / could not be propagated rapidly from seed (Paragraphs A & B)\n4. Semper Augustus (Paragraph B)',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_lis_6',
    module: 'Listening',
    topic: 'Technology',
    subType: 'Section 3 · Engineering Capstone Review',
    frequency: 'Practice Standard',
    title: 'Perovskite-Silicon Tandem Solar Cells Efficiency Trial',
    prompt:
      'READ THE SECTION 3 ACADEMIC DIALOGUE & ANSWER QUESTIONS 1–4:\n\nSupervisor (Dr. Russell): "Welcome back, Priya and Marcus. Let’s examine the outdoor degradation results from your rooftop perovskite-silicon tandem solar panels."\nPriya: "Well, Dr. Russell, in dry laboratory simulators our tandem cells achieved a 29.4% power conversion efficiency—well above the 22% limit of conventional silicon panels. However, once mounted on the engineering roof during October’s heavy rainfall, efficiency dropped by 8% within three weeks."\nMarcus: "We initially suspected ultraviolet thermal cracking of the top glass layer. Yet when we ran electron microscopy, the culprit was moisture ingress dissolving the lead-halide perovskite crystal lattice along the perimeter seal."\nSupervisor: "And how do you propose encapsulating the cells for phase two?"\nPriya: "Replacing the polymer edge tape with a hermetic polyisobutylene edge seal and an atomic-layer aluminum oxide barrier completely halted moisture degradation in our humidity chamber."\n\nQUESTIONS:\n1. What power conversion efficiency (%) did the tandem cells achieve in dry laboratory simulators?\n2. What did the students initially suspect caused the rooftop efficiency drop?\n3. What was the actual cause of the crystal degradation revealed by electron microscopy?\n4. Which oxide material did they use as an atomic-layer barrier to stop moisture?',
    suggestedTimeMinutes: 10,
    examinerTips: [
      'Distinguish carefully between the "initial suspicion" (UV thermal cracking) and the "actual cause confirmed by microscopy" (moisture ingress).'
    ],
    keyVocabulary: [
      { word: 'Conversion efficiency', meaning_bn: 'সৌরশক্তিকে বিদ্যুতে রূপান্তরের দক্ষতার হার' },
      { word: 'Moisture ingress', meaning_bn: 'ভেতরে জলীয় বাষ্প বা আর্দ্রতা প্রবেশ করা' },
      { word: 'Hermetic seal', meaning_bn: 'সম্পূর্ণ বায়ু ও পানিরোধী আবরণ' }
    ],
    modelAnswer:
      'OFFICIAL ANSWER KEY:\n\n1. 29.4%\n2. Ultraviolet (UV) thermal cracking (of the top glass layer)\n3. Moisture ingress (dissolving the lead-halide perovskite crystal lattice)\n4. Aluminum oxide',
    modelBand: 'Band 9.0'
  }
];

IELTS_QUESTION_BANK.push(...ADDITIONAL_CAMBRIDGE_QB_ITEMS, ...EXPANDED_MODULE_QB_ITEMS);



