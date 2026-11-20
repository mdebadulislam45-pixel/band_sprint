# IELTS SPRINT Source Update Notes

## Changes in this package

- Corrected the Reading practice selector so it reflects the actual data model: each selected practice set contains one Reading passage.
- Renamed the Reading selector controls from misleading “PASSAGE 1–3” labels to “SET 1–5” and made all five available mock practice sets selectable from the Reading pane.
- Updated the Reading header to show the selected practice-set number and total available sets.
- Replaced the hard-coded approximate passage length with a live word count from the selected passage.
- Updated the mobile Reading question-pane indicator to “Passage 1 of 1”.
- Reworded user-facing labels and README copy to avoid implying that generated neural speech or the independent simulator is IELTS/Sprint audio or an official Sprint product.

## Important existing content limitations

- The current mock exam data contains five practice sets.
- Each set currently has one Reading passage.
- The current mock Listening data explicitly provides Section 1 only; Sections 2–4 are marked unavailable. This package does not invent replacement recordings or claim generated speech is authentic Sprint audio.
- `audioSrc` is not populated in the mock exam data, so Listening speech is generated through the existing speech/audio pipeline rather than loaded as Sprint MP3 recordings.

## Verification status

- Source archive extraction and file inventory completed.
- The TypeScript check was attempted, but could not run because dependencies are not installed in this environment (`@types/node` is missing).
- `npm ci` did not complete within the available execution window.
- A production build and automated test suite therefore have **not** been verified here. Please install dependencies in Google AI Studio and run the project checks there before publishing.

## Safety / scope

- Existing application modules, authentication, Firebase configuration, payment integrations, storage structures, audio services, examiner identities, and question-bank data were not intentionally redesigned.
- No deployment, publishing, commit, or push operation was performed.
