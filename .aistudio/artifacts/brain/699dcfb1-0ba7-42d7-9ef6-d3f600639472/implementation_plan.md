# IELTS Speaking Studio Upgrade Plan: Humanoid/Studio Anime Examiner, AI Live Speaking Partner & WebRTC Camera Booth

## 1. Visual & Architectural Vision
To replace the flat geometric SVG cartoon avatar shown in your screenshots and elevate the Speaking Exam & Practice experience to an authentic Cambridge Video-Call Assessment Booth:

### A. High-Craft Humanoid & Studio Anime Examiner Avatars (Anti-Cartoon Upgrade)
- **Dual Art-Style Switcher (3D Humanoid & Studio Anime)**:
  - **Semi-Realistic 3D Humanoid Style (Default)**: Replaces flat `<ellipse>`/`<circle>` cartoon shapes with multi-layered anatomical portraits for **Dr. Clara Sterling** (Senior Cambridge Examiner), **Prof. Arthur Pendelton** (Visiting Oxbridge Assessor), and **Dr. Alistair Vance** (Chief Examiner). Features realistic facial proportions, subsurface skin shading gradients, detailed iris/cornea reflections, sculpted hair strands, tailored academic blazer/attire, natural micro-saccade eye movement, breathing chest motion, and multi-stage acoustic viseme lip-sync driven by live speech cadence.
  - **Studio Anime Style (Makoto Shinkai / Kyoto Animation Aesthetic)**: Optional 1-click toggle for candidates who prefer an expressive, high-detail illustrated anime examiner with multi-layered cel-shaded lighting, expressive multi-highlight eyes, and smooth mouth visemes.

### B. True "AI Live Speaking Partner" Mode (Free-Talk & Adaptive Follow-Ups)
- **Two Practice Modes in `LiveAvatarSpeakingPartner`**:
  1. **5-Minute Part 1 Sprint Drill**: Structured timed practice across common Cambridge Part 1 topics.
  2. **AI Live Speaking Partner (Adaptive Free-Talk Mode)**: A continuous, natural back-and-forth live conversation where the AI Examiner listens to what you actually say, extracts your key points/keywords, responds conversationally to your specific point, asks dynamic Socratic follow-up questions (or lets you pick any custom topic/scenario), and provides live inline grammar coaching and C1/C2 lexical upgrades in real time.

### C. WebRTC Candidate Camera Studio (Exam & Practice Sections)
- **Dedicated Reusable `CandidateCameraBooth` Component**:
  - Integrates real browser camera access (`navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } })`) into **both**:
    1. **Practice Section (`LiveAvatarSpeakingPartner.tsx`)**: Split-screen / Picture-in-Picture video call layout alongside the Examiner Avatar.
    2. **Full Exam Section (`VoiceExaminer.tsx`)**: Official Cambridge Video-Call IELTS Speaking Booth during ID Check (presenting passport/ID to camera) and Parts 1, 2, and 3.
- **Interactive Camera Features**:
  - **Live Eye-Contact & Presence Coach HUD**: Real-time frame luminescence & head-centering tracker that measures camera engagement, posture framing, and speaking presence confidence (`Eye Contact %`, `Framing Nominal`, `Studio Blur` filter toggle, and `Mirror Flip` toggle).
  - **Privacy & Graceful Fallback**: One-click camera On/Off toggle, zero server uploads (100% local in-browser video stream), and automatic clean fallback if a device has no webcam or permission is declined.

---

## 2. Planned File Changes

1. **`/metadata.json`**:
   - Add `"camera"` alongside `"microphone"` in `requestFramePermissions` so the browser/iframe permits WebRTC video streaming.
2. **`/src/components/speaking/CandidateCameraBooth.tsx` (New Component)**:
   - Self-contained WebRTC camera feed manager with live video stream, studio background blur/lighting toggle, mirror flip, real-time optical centering & eye-contact confidence telemetry, ID verification frame overlay (for `ID_CHECK` stage), and clean hardware fallback.
3. **`/src/components/speaking/ExaminerHumanoidCanvas.tsx` (New Component)**:
   - High-detail anatomical SVG/Canvas examiner renderer supporting both **Semi-Realistic Humanoid** and **Studio Anime** visual styles, 6-state phoneme/viseme mouth articulation, natural eye blinks, head nods while listening, and examiner persona selection.
4. **`/src/components/speaking/LiveAvatarSpeakingPartner.tsx`**:
   - Replace the old cartoon `ExaminerAvatar3DCanvas` with `ExaminerHumanoidCanvas`.
   - Add the **AI Live Speaking Partner (Adaptive Free-Talk)** mode with contextual conversational replies and dynamic follow-up generation based on the user's spoken transcript.
   - Integrate `CandidateCameraBooth` for a realistic Zoom/Cambridge Video-Call split-screen or PiP view.
5. **`/src/components/VoiceExaminer.tsx` & `/src/components/pages/SpeakingLabPage.tsx`**:
   - Embed the upgraded `ExaminerHumanoidCanvas` and `CandidateCameraBooth` into the full 3-Part Speaking Exam simulator (`PRE_TEST`, `ID_CHECK`, `PART_1`, `PART_2_PREP`, `PART_2_SPEAK`, `PART_3`) so candidates experience a realistic face-to-face video exam.
