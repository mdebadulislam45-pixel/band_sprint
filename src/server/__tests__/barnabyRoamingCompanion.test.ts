import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BARNABY_LOCOMOTION_STATES,
  BarnabyRect,
  clampBarnabyPosition,
  computeFacing,
  computeFlightDurationMs,
  computeOverlapArea,
  computeWalkStepTarget,
  findNonObstructiveSpot,
  generateCandidatePerches,
  getBarnabySize,
  getSafeViewportBounds,
  isPositionObstructed,
  pickApproachTarget,
  pickNextRoamTarget,
  pickRestPerch
} from '../../services/barnabyRoamEngine';
import { BarnabyDragonAvatar } from '../../components/common/BarnabyDragonAvatar';

describe('Barnaby Independent Freely Roaming Companion — Spatial Engine & Locomotion', () => {
  it('adapts character dimensions and safe bounds cleanly across desktop and mobile viewports', () => {
    const desktopSize = getBarnabySize(1360);
    const mobileSize = getBarnabySize(390);

    assert.ok(desktopSize.width > mobileSize.width);
    assert.ok(desktopSize.height > mobileSize.height);

    const desktopBounds = getSafeViewportBounds(1360, 768);
    assert.ok(desktopBounds.minY >= 68);
    assert.ok(desktopBounds.maxX <= 1360 - desktopSize.width);

    const mobileBounds = getSafeViewportBounds(390, 844);
    // Respects mobile bottom navigation bar
    assert.ok(mobileBounds.maxY <= 844 - mobileSize.height - 80);

    // Extreme out-of-bounds points are clamped strictly inside the visible viewport
    const clampedHigh = clampBarnabyPosition({ x: 9999, y: 9999 }, 390, 844);
    assert.equal(clampedHigh.x, mobileBounds.maxX);
    assert.equal(clampedHigh.y, mobileBounds.maxY);

    const clampedLow = clampBarnabyPosition({ x: -200, y: -50 }, 1360, 768);
    assert.equal(clampedLow.x, desktopBounds.minX);
    assert.equal(clampedLow.y, desktopBounds.minY);
  });

  it('avoids critical modals, active inputs, and primary buttons when choosing destinations or evading', () => {
    const vw = 1360;
    const vh = 768;
    const size = getBarnabySize(vw);

    // Place a critical dialog covering the bottom-right corner where Barnaby sits
    const modalObstacle: BarnabyRect = {
      left: 980,
      top: 480,
      right: 1350,
      bottom: 760,
      priority: 'critical'
    };

    const sittingInModal = { x: 1220, y: 610 };
    assert.equal(isPositionObstructed(sittingInModal, size, [modalObstacle]), true);

    const evaded = findNonObstructiveSpot({
      current: sittingInModal,
      viewportWidth: vw,
      viewportHeight: vh,
      obstacles: [modalObstacle]
    });
    assert.ok(evaded, 'Expected Barnaby to evade overlapping modal');
    assert.equal(
      isPositionObstructed(evaded!, size, [modalObstacle]),
      false,
      'Evaded spot must not overlap the critical modal'
    );

    // Autonomous roaming target must also avoid the modal and travel meaningfully
    const nextRoam = pickNextRoamTarget({
      current: { x: 1220, y: 120 },
      viewportWidth: vw,
      viewportHeight: vh,
      obstacles: [modalObstacle],
      rng: () => 0.2
    });
    const overlap = computeOverlapArea(
      {
        left: nextRoam.point.x,
        top: nextRoam.point.y,
        right: nextRoam.point.x + size.width,
        bottom: nextRoam.point.y + size.height
      },
      modalObstacle
    );
    assert.equal(overlap, 0);
  });

  it('computes smooth proportional flight durations, directional facing, walking steps, and resting perches', () => {
    const shortMs = computeFlightDurationMs({ x: 100, y: 100 }, { x: 180, y: 120 });
    const longMs = computeFlightDurationMs({ x: 100, y: 100 }, { x: 1100, y: 600 });
    assert.ok(shortMs >= 800 && shortMs < longMs);
    assert.ok(longMs <= 2100);

    assert.equal(computeFacing({ x: 500, y: 200 }, { x: 200, y: 200 }), 'left');
    assert.equal(computeFacing({ x: 200, y: 200 }, { x: 600, y: 200 }), 'right');

    const perches = generateCandidatePerches(1360, 768);
    assert.ok(perches.length >= 15);

    const userChosenSpot = { x: 1180, y: 540 };
    const rest = pickRestPerch({
      current: { x: 400, y: 200 },
      viewportWidth: 1360,
      viewportHeight: 768,
      obstacles: [],
      userRestSpot: userChosenSpot
    });
    assert.deepEqual(rest, userChosenSpot);

    const walk = computeWalkStepTarget({
      current: { x: 900, y: 600 },
      viewportWidth: 1360,
      viewportHeight: 768,
      obstacles: []
    });
    assert.ok(walk);
    assert.ok(Math.abs(walk!.point.x - 900) >= 40);

    const approach = pickApproachTarget({
      current: { x: 300, y: 300 },
      viewportWidth: 1360,
      viewportHeight: 768,
      obstacles: []
    });
    assert.ok(approach.x >= 0 && approach.y >= 68);
  });

  it('renders all Barnaby locomotion postures cleanly while strictly preserving TTS-gated mouth animation', () => {
    for (const loc of BARNABY_LOCOMOTION_STATES) {
      const html = renderToStaticMarkup(
        React.createElement(BarnabyDragonAvatar, {
          variant: 'full',
          framed: 'none',
          size: 'studio',
          state: 'idle',
          locomotion: loc,
          facing: loc === 'flying' ? 'left' : 'right',
          isSpeaking: false
        })
      );
      assert.match(html, new RegExp(`data-locomotion="${loc}"`));
      assert.match(html, /data-variant="full"/);
      assert.doesNotMatch(html, /data-mouth-state="speaking-active"/);

      if (loc === 'flying') {
        assert.match(html, /barnaby-rig-fly-wing-left/);
        assert.match(html, /data-facing="left"/);
        assert.match(html, /scaleX\(-1\)/);
      }
      if (loc === 'walking') {
        assert.match(html, /barnaby-rig-walk-leg-left/);
      }
      if (loc === 'looking') {
        assert.match(html, /barnaby-rig-look-head/);
      }
    }
  });
});
