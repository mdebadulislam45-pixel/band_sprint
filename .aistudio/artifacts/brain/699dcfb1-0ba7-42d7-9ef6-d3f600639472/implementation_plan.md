# IELTSly.ai Benchmark & Dashboard Experience Upgrade Plan

> An executive architectural blueprint to upgrade the IELTS Sprint™ dashboard to match and exceed **IELTSly.ai** and leading IELTS prep platforms (IDP/Cambridge, IELTS Ready, E2Language) while preserving 100% of existing features, tests, audio suites, and state stores.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Zero Code Changes Execution Gate**: As per your explicit instructions (*"first make the plan and show don't exquisite any changes without my permission"*), **no source code has been altered**. Review this detailed plan and click **"Proceed"** or provide feedback to authorize execution.

- **Feature Preservation Guarantee**: All existing components (Full Cambridge tests, CD-IELTS Exam Mode, Mistake Vault, Band Calculator, Audio Labs, Vocab Decks, Bangla Guide, Beginner 101, Slide Guides, Task 1 Visualizer, Argument Matrix, Auth, and Commercial features) will remain 100% intact and functional.
- **Visual & Layout Strategy**: The home dashboard will adopt a modern, high-density IELTSly-inspired "Mission Control" layout with:
  1. **AI Band Scorecard & Criteria Diagnostic** (Current Band vs Target Band with 4-Skill visual breakdown).
  2. **AI Speaking Partner Quick-Launcher** (1-click voice interview simulation for Parts 1, 2, and 3).
  3. **AI Essay Evaluator & Rewriter Dock** (Instant band evaluation mapped to official Cambridge rubrics).
  4. **Smart Weakness Heatmap & Targeted Next Drill** (Automated error diagnostics pinpointing sub-skills like True/False/Not Given, Part 2 cue timing, or lexical repetition).
  5. **Daily Goal & XP Tracker** (Study time, daily target minutes, streak flame, and readiness score).

---

## 1. Overview & Core Concept

### What It Delivers
A world-class, AI-augmented IELTS dashboard experience modeled after **IELTSly.ai**, **IELTS Ready: Premium (British Council)**, and **Cambridge English Empower**. It transforms the home view into an adaptive preparation command center where candidates see their real-time estimated band, identified weaknesses, active study streak, and immediate 1-click drill recommendations without hunting through sub-menus.

### Competitive Gap Analysis (What We Are Lagging & Upgrading)

| Feature Dimension | Current IELTS Sprint App | IELTSly.ai Benchmark | Planned Upgrade (Our New Dashboard) |
| :--- | :--- | :--- | :--- |
| **Band Progress Tracking** | General percentage donut + simple estimated band | Dynamic Predicted Band + 4-Skill criteria breakdown (L, R, W1/W2, S1/S2/S3) | **Interactive AI Band Predictor & Scorecard**: Visual sub-score bars, target delta indicator (+1.0 needed), and Cambridge descriptor criteria tags. |
| **AI Speaking Access** | Inside Speaking Lab / Voice Examiner page | Instant "Talk to Mihu" AI Speaking Partner card directly on dashboard | **Live AI Speaking Quick-Partner Widget**: 1-click launch into Part 1 / Part 2 / Part 3 with audio test prompt preview and topic selector. |
| **AI Writing Evaluation** | Located inside Writing Lab sub-views | Instant essay evaluator & criterion checker accessible from dashboard | **Instant AI Essay Evaluator Dock**: Quick essay paste / question picker with instant Cambridge rubric breakdown (TR, CC, LR, GRA). |
| **Weakness Diagnostics** | Raw mistake count in Mistake Vault | Automated Weakness Detector isolating specific question types and error traps | **AI Weakness Diagnostic Radar**: Categorizes error patterns (e.g., T/F/NG traps, map labellings, cohesion linkers, pronunciation pacing) + 1-click "Fix This Weakness" drills. |
| **Daily Goal & Gamification** | Streak count in top hero banner | Daily goal timer (e.g., 35/45 mins), XP points, and streak status | **Daily Sprint Goal & Momentum Hub**: Live daily study progress ring, minutes remaining, XP multiplier, and test countdown timer. |
| **Next Best Action** | Daily mission list | "Smart Recommended Next Drill" personalized to lowest-performing skill | **Intelligent AI Recommendation Banner**: Analyzes user's lowest band skill and prescribes the highest-impact 10-15 min drill. |

---

## 2. User Experience & Visual Design

### Key User Flows

```
┌────────────────────────────────────────────────────────────────────────┐
│                        UPGRADED HOME DASHBOARD                         │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Mission Control Header: Exam Date Countdown · Target Band · Streak  │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Smart Recommendation: "Your weakest area is Writing Task 2 Cohesion"│
│    [ Start 10-Min Target Drill → ]                                     │
├──────────────────────────────────┬─────────────────────────────────────┤
│ MAIN COLUMN (8 Cols)             │ SIDEBAR COLUMN (4 Cols)             │
│ • Predicted Band & 4-Skill Matrix│ • AI Speaking Partner (Mihu Voice)  │
│ • Cambridge Exam Simulator Dock  │ • Daily Goal & XP Progress Ring     │
│ • AI Writing Quick Evaluator     │ • Weakness Radar (Error Triage)     │
│ • 4 Core Skills Interactive Hub  │ • Active Practice Session Recovery  │
│ • Recent Mock Attempts & Trends  │ • Quick Utility Launchpad           │
└──────────────────────────────────┴─────────────────────────────────────┘
```

### Visual Identity & Theme
- **Color Palette & Atmosphere**:
  - Background: Crisp institutional slate `#0B1224` (dark mode) / `#F8FAFC` (light mode).
  - Primary Accent: Cambridge Academic Indigo `#3B82F6` and British Navy `#1E3A8A`.
  - Secondary Accents: Emerald `#10B981` (mastered / high band), Amber `#F59E0B` (needs improvement), Purple `#8B5CF6` (AI intelligence).
- **Typography & Layout Density**:
  - Display Font: `Plus Jakarta Sans` / `Outfit` for confident, modern academic headings.
  - Tabular Numerals: `font-mono tabular-nums` for all band scores, timers, question counts, and percentages to eliminate jitter.
  - Cards: High-density, single-elevation cards with crisp 1px borders (`border-slate-200/80 dark:border-slate-800`), avoiding nested-card clutter.

---

## 3. Key Product Decisions & Trade-Offs

### 1. Zero Modification to Core Engines
- **Decision**: Keep all underlying test engines, audio playback pipelines, scoring utilities (`userStorage.ts`, `vaultStorage.ts`, `geminiLiveService.ts`, etc.) completely unchanged.
- **Why**: Ensures absolute stability, zero regression, and preservation of user data and existing practice modules.

### 2. Modular Dashboard Component Architecture
- **Decision**: Create dedicated modular widgets in `src/components/home/` rather than a monolithic dashboard file:
  - `AIBandScorecard.tsx`: Real-time predicted band vs target band with module breakdown.
  - `AISpeakingPartnerCard.tsx`: Instant audio examiner launch card (modeled after IELTSly's Mihu).
  - `AIWritingQuickEvaluator.tsx`: Fast writing check with criteria rubrics.
  - `AIWeaknessDetector.tsx`: Diagnostic heatmap identifying question traps and error trends.
  - `DailyGoalMomentumCard.tsx`: Visual study minutes goal and XP progression.
  - `SmartRecommendationBanner.tsx`: Contextual recommendation based on recent diagnostic performance.
- **Why**: Keeps code clean, testable, maintainable, and allows instant toggle between Overview, Skills, and Labs views.

### 3. Preservation of Academic & General Training Tracks
- **Decision**: Retain 1-click track toggling (`Academic` ↔ `General Training`) across all new widgets so both test formats receive tailored band scoring tables and task prompts.

---

## 4. Technical Architecture & Component Diagrams

```
                    ┌────────────────────────┐
                    │      App.tsx State     │
                    │  (user, examMode, nav) │
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │    HomeDashboard.tsx   │
                    └───────────┬────────────┘
                                │
   ┌────────────────────────────┼───────────────────────────┐
   │                            │                           │
┌──▼────────────────┐  ┌────────▼──────────┐      ┌─────────▼────────┐
│ SmartRecommendation│  │  AIBandScorecard  │      │AISpeakingPartner │
│ Banner (Dynamic)   │  │  (4 Skills + Δ)   │      │Card (Mihu Voice) │
└──┬────────────────┘  └────────┬──────────┘      └─────────┬────────┘
   │                            │                           │
┌──▼────────────────┐  ┌────────▼──────────┐      ┌─────────▼────────┐
│ AIWritingEvaluator│  │AIWeaknessDetector │      │DailyGoalMomentum │
│ Dock (Rubric AI)  │  │(Error Diagnostics)│      │(Timer + XP Ring) │
└──┬────────────────┘  └────────┬──────────┘      └─────────┬────────┘
   │                            │                           │
   └────────────────────────────┼───────────────────────────┘
                                │
                  ┌─────────────▼────────────┐
                  │ Existing Underlying Labs │
                  │  (Speaking, Writing,     │
                  │   Listening, Reading,    │
                  │   Cambridge, CDIELTS)    │
                  └──────────────────────────┘
```

---

## 5. Phased Execution Roadmap (Pending Approval)

Once approved, the implementation will proceed in four focused steps:

1. **Step 1: Dashboard Widgets Creation**:
   - Build `AIBandScorecard.tsx`, `AISpeakingPartnerCard.tsx`, `AIWritingQuickEvaluator.tsx`, `AIWeaknessDetector.tsx`, and `DailyGoalMomentumCard.tsx` in `src/components/home/`.
2. **Step 2: Dashboard Layout Integration**:
   - Integrate the new widgets into `HomeDashboard.tsx` under the responsive 12-column grid.
   - Retain all existing tabs, search modals, mistake vault triggers, and commercial modals.
3. **Step 3: Verification & Interactive Polish**:
   - Wire all buttons to existing navigation targets (`practice`, `speaking`, `writing`, `reading`, `listening`, `cdielts`, `history`).
   - Validate sound effects, dark/light theme switching, and responsive mobile/desktop layouts.
4. **Step 4: Quality & Compilation Checks**:
   - Run `compile_applet` and verify zero TypeScript, ESLint, or runtime errors.

---

> [!NOTE]
> **Awaiting Your Approval**: To start implementing these upgrades, please click **Proceed** in the Plan Approval Curtain above or let me know what adjustments you would like.
