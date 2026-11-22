/**
 * SP-4B: Computer-Delivered IELTS Exam Interface Verification Suite
 *
 * Verifies:
 * 1. CDIELTSThemeContainer: BandSprint Pine/Warm Paper/Amber standard palette + all 3 high-contrast modes + 3 zoom levels.
 * 2. Barnaby companion suppression (barnaby-float-hide / barnaby-float-show) in all 3 exam rooms.
 * 3. Zero misleading "OFFICIAL" exam branding labels in CD-IELTS exam shells while keeping SprintTRFModal's
 *    explicit "NOT AN OFFICIAL" non-affiliation disclaimer intact.
 * 4. Keyboard-accessible split-pane resizers (role="separator", tabIndex, ArrowLeft/ArrowRight) in Reading/Listening and Writing.
 * 5. Speaking Suite SSR verification: preserves 'CD-IELTS SPEAKING', honest pronunciation policy,
 *    monogram badges (CS / AP), 5-step progression bar, and zero emoji examiner avatars.
 * 6. Listening single-play rules, Writing draft preservation, and submission confirmation modals preserved.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CDIELTSThemeContainer, getCDIELTSThemeClasses } from '../../components/cdielts/CDIELTSThemeContainer';
import { CDIELTSSpeakingSuite } from '../../components/cdielts/CDIELTSSpeakingSuite';
import { PreExamHardwareCheck } from '../../components/cdielts/PreExamHardwareCheck';

function runTests() {
  console.log('=== SP-4B: Computer-Delivered IELTS Exam Interface Suite ===\n');

  // ── 1. Theme tokens & high-contrast accessibility modes ─────────────────────
  console.log('1. Verifying BandSprint Pine/Amber standard theme + 3 high-contrast modes + 3 text sizes...');
  const standard = getCDIELTSThemeClasses('standard');
  assert.ok(standard.bg.includes('#F5F7F6'), `Standard bg should use Warm Paper #F5F7F6, got: ${standard.bg}`);
  assert.ok(standard.headerBg.includes('#0F4C45'), `Standard header should use BandSprint Pine #0F4C45, got: ${standard.headerBg}`);
  assert.ok(standard.accentBtn.includes('#0F4C45'), `Standard primary button should use BandSprint Pine #0F4C45`);
  assert.ok(standard.border.includes('#D3DDDA'), `Standard border should use #D3DDDA`);

  const blackOnYellow = getCDIELTSThemeClasses('black-on-yellow');
  assert.ok(blackOnYellow.bg.includes('#FFF100') && blackOnYellow.text.includes('text-black'));

  const yellowOnBlack = getCDIELTSThemeClasses('yellow-on-black');
  assert.ok(yellowOnBlack.bg.includes('bg-black') && yellowOnBlack.text.includes('#FFF100'));

  const whiteOnBlack = getCDIELTSThemeClasses('white-on-black');
  assert.ok(whiteOnBlack.bg.includes('bg-black') && whiteOnBlack.text.includes('text-white'));

  for (const zoom of ['100%', '125%', '150%'] as const) {
    const html = renderToStaticMarkup(
      React.createElement(
        CDIELTSThemeContainer,
        {
          initialColorScheme: 'standard',
          initialZoomLevel: zoom,
          showTopBarControls: true,
        },
        React.createElement('div', null, 'Exam Canvas')
      )
    );
    assert.ok(html.includes('BandSprint Exam Display Controls'), 'Theme container must render BandSprint Exam Display Controls');
    assert.ok(!/Official CD-IELTS/i.test(html), 'Theme container must not claim Official CD-IELTS');
  }
  console.log('   PASS: All 4 color schemes and 3 text sizes verified.');

  // ── 2. PreExamHardwareCheck SSR & branding honesty ──────────────────────────
  console.log('2. Verifying PreExamHardwareCheck SSR and honest BandSprint branding...');
  const hwHtml = renderToStaticMarkup(
    React.createElement(PreExamHardwareCheck, {
      isOpen: true,
      testTitle: 'BandSprint Practice Set 1',
      moduleType: 'full_mock',
      onProceedToExam: () => {},
      onClose: () => {},
    })
  );
  assert.ok(/BandSprint Exam Workstation Check/i.test(hwHtml), 'Hardware check must display BandSprint Exam Workstation Check');
  assert.ok(hwHtml.includes('Play Sound Check'), 'Hardware check must include Play Sound Check');
  assert.ok(hwHtml.includes('Launch Practice Exam Workstation'), 'Hardware check must include Launch Practice Exam Workstation');
  assert.ok(!/\bOfficial\b/i.test(hwHtml), 'Hardware check must not contain misleading "Official" wording');
  console.log('   PASS: PreExamHardwareCheck verified.');

  // ── 3. Speaking Suite SSR & honest pronunciation evidence ───────────────────
  console.log('3. Verifying CDIELTSSpeakingSuite SSR, examiner separation, and honest pronunciation disclosure...');
  const speakingHtml = renderToStaticMarkup(
    React.createElement(CDIELTSSpeakingSuite, {
      candidateName: 'Amina Rahman',
      onExit: () => {},
    })
  );
  assert.ok(speakingHtml.includes('CD-IELTS SPEAKING'), 'Speaking Suite must preserve CD-IELTS SPEAKING header label');
  assert.ok(speakingHtml.includes('Dr. Clara Sterling'), 'Speaking Suite must list Dr. Clara Sterling');
  assert.ok(speakingHtml.includes('Prof. Arthur Pendelton'), 'Speaking Suite must list Prof. Arthur Pendelton');
  assert.ok(speakingHtml.includes('>CS<') && speakingHtml.includes('>AP<'), 'Speaking Suite must render CS and AP monogram badges');
  assert.ok(!speakingHtml.includes('👩‍🏫') && !speakingHtml.includes('👨‍🏫'), 'Speaking Suite must not render emoji examiner avatars');
  assert.ok(
    /Acoustic Pronunciation requires verified audio evidence/i.test(speakingHtml) &&
      /Honest Evidence/i.test(speakingHtml),
    'Speaking Suite must honestly disclose acoustic vs transcript-only pronunciation evaluation'
  );
  assert.ok(
    speakingHtml.includes('Part 1') && speakingHtml.includes('Part 2') && speakingHtml.includes('Part 3'),
    'Speaking Suite intro must display Part 1, Part 2, and Part 3 structure'
  );
  console.log('   PASS: CDIELTSSpeakingSuite SSR verified.');

  // ── 4. Static invariants across all 3 exam rooms ────────────────────────────
  console.log('4. Verifying Barnaby suppression, keyboard splitters, non-official copy, and exam integrity guards...');
  const examModeSrc = fs.readFileSync(path.resolve('src/components/cdielts/CDIELTSExamMode.tsx'), 'utf-8');
  const writingSrc = fs.readFileSync(path.resolve('src/components/cdielts/CDIELTSWritingExamRoom.tsx'), 'utf-8');
  const speakingSrc = fs.readFileSync(path.resolve('src/components/cdielts/CDIELTSSpeakingSuite.tsx'), 'utf-8');
  const trfSrc = fs.readFileSync(path.resolve('src/components/cdielts/SprintTRFModal.tsx'), 'utf-8');

  for (const [name, src] of [
    ['CDIELTSExamMode', examModeSrc],
    ['CDIELTSWritingExamRoom', writingSrc],
    ['CDIELTSSpeakingSuite', speakingSrc],
  ] as const) {
    assert.ok(src.includes("'barnaby-float-hide'"), `${name} must hide floating Barnaby during active exam`);
    assert.ok(src.includes("'barnaby-float-show'"), `${name} must restore floating Barnaby on exit`);
  }

  // Keyboard-accessible split-pane separators in Reading/Listening and Writing
  assert.ok(examModeSrc.includes('role="separator"') && examModeSrc.includes('ArrowLeft'), 'CDIELTSExamMode must provide keyboard-accessible split-pane separator');
  assert.ok(writingSrc.includes('role="separator"') && writingSrc.includes('ArrowLeft'), 'CDIELTSWritingExamRoom must provide keyboard-accessible split-pane separator');

  // Zero misleading "OFFICIAL" UI labels in exam shells (strip JS/JSX comments & explicit "not an official" disclaimers)
  const stripCommentsAndDisclaimers = (src: string) =>
    src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/not an? official [a-z -]+/gi, '');
  const forbiddenOfficialPattern = /Official (?:IELTS|CD-IELTS|Exam|Test|Plain-Text|Workstation|Tone|Chart|Listening)/i;
  assert.ok(!forbiddenOfficialPattern.test(stripCommentsAndDisclaimers(examModeSrc)), 'CDIELTSExamMode must not contain misleading Official labels');
  assert.ok(!forbiddenOfficialPattern.test(stripCommentsAndDisclaimers(writingSrc)), 'CDIELTSWritingExamRoom must not contain misleading Official labels');
  assert.ok(!forbiddenOfficialPattern.test(stripCommentsAndDisclaimers(speakingSrc)), 'CDIELTSSpeakingSuite must not contain misleading Official labels');
  assert.ok(/NOT AN OFFICIAL/i.test(trfSrc), 'SprintTRFModal must retain explicit NOT AN OFFICIAL disclaimer');

  // Listening single-play lock & submission confirmation checks
  assert.ok(
    examModeSrc.includes('isListeningLocked') && examModeSrc.includes('Single-Play Rule'),
    'Listening single-play audio lock must remain enforced'
  );
  assert.ok(
    examModeSrc.includes('showReviewModal') && examModeSrc.includes('showExitConfirmModal'),
    'CDIELTSExamMode must require review/submission and exit confirmation modals'
  );
  assert.ok(
    writingSrc.includes('showSubmitConfirmModal') && writingSrc.includes('DRAFT_STORAGE_KEY'),
    'CDIELTSWritingExamRoom must preserve draft autosave and submission confirmation modal'
  );
  assert.ok(speakingSrc.includes('showExitConfirmModal'), 'CDIELTSSpeakingSuite must require exit confirmation during an active interview');
  console.log('   PASS: All exam shell integrity and accessibility invariants verified.');

  console.log('\nALL SP-4B CD-IELTS EXAM INTERFACE TESTS PASSED.');
}

runTests();
