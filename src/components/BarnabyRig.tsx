import React, { useCallback, useEffect, useRef, useState } from 'react';
import type {
  BarnabyAnimationState,
  BarnabyCanonicalPose,
  BarnabyExpression,
  BarnabyFelineBehavior,
  BarnabyMode,
  BarnabyMoodState,
} from '../types/barnaby';
import { getBarnabyExpressionConfig } from '../utils/barnabyStateEngine';
import {
  BarnabyFiveViseme,
  BarnabyLipSyncState,
  BarnabyMouthShapeIndex,
  useBarnabyLipSync,
} from '../hooks/useBarnabyLipSync';
import { BarnabyCrest } from './common/BarnabyCrest';

export type BarnabySpritePose = BarnabyCanonicalPose | 'floating';
export type BarnabyLocomotion = 'walk' | 'stand' | 'hover';
export type BarnabyLipSyncViseme = BarnabyFiveViseme;
export type BarnabySevenActivity =
  | 'walking'
  | 'energetic'
  | 'paw-licking'
  | 'bored'
  | 'sleeping'
  | 'thinking'
  | 'speaking';

export type {
  BarnabyAnimationState,
  BarnabyMoodState,
  BarnabyFelineBehavior,
  BarnabyMouthShapeIndex,
};

export interface BarnabyRigProps {
  expression?: BarnabyExpression;
  mode?: BarnabyMode;
  /** Explicit feline behavior state (walking, paw-licking, energetic, bored, sleeping, thinking, speaking) */
  felineBehavior?: BarnabyFelineBehavior;
  /** Explicit animation state override */
  animationState?: BarnabyAnimationState;
  /** Semantic mood state used when animationState is not explicitly forced */
  moodState?: BarnabyMoodState;
  activityId?: string;
  spokenText?: string | null;
  cueText?: string | null;
  speakSignal?: number;
  stopSpeakSignal?: number;
  enableVoiceCues?: boolean;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onLipSyncChange?: (lipSync: {
    energy: number;
    viseme: BarnabyLipSyncViseme;
    mouthShapeIndex?: BarnabyMouthShapeIndex;
    cheekPuff?: number;
  }) => void;
  locomotion?: BarnabyLocomotion;
  walkSpeedFactor?: number;
  facingDirection?: 'left' | 'right';
  spritePose?: BarnabySpritePose;
  isSpeaking?: boolean;
  interactive?: boolean;
  trackWindowPointer?: boolean;
  dragVelocity?: { vx: number; vy: number };
  isDragging?: boolean;
  hopSignal?: number;
  affectionSignal?: number;
  isAffectionate?: boolean;
  isSleeping?: boolean;
  isPurring?: boolean;
  showCelestialStars?: boolean;
  /** Cursor gaze-tracking head rotation in degrees (-9..+9) */
  gazeRotationDeg?: number;
  /** Cursor gaze-tracking subtle head offset in px */
  gazeOffset?: { x: number; y: number };
  onTap?: () => void;
  className?: string;
  canvasClassName?: string;
  ariaLabel?: string;
  testId?: string;
}

const CANVAS_SIZE = 260;
const IDLE_ARTWORK_URL = '/assets/barnaby/idle.jpg';
const WALK_PROFILE_ARTWORK_URL = '/assets/barnaby/walk_profile.jpg';
const GROOM_ARTWORK_URL = '/assets/barnaby/groom.jpg';
const SLEEP_ARTWORK_URL = '/assets/barnaby/sleep.jpg';
const FALLBACK_PNG_URL = '/assets/barnaby/floating.png';

const WALK_VIDEO_URL = '/assets/barnaby/walk.mp4';
const HOVER_VIDEO_URL = '/assets/barnaby/hover.mp4';

interface FurEyePalette {
  leftLid: string;
  leftShade: string;
  rightLid: string;
  rightShade: string;
}

interface KeyedSpriteRig {
  fullCanvas: HTMLCanvasElement;
  bodyCanvas: HTMLCanvasElement;
  upperTorsoCanvas: HTMLCanvasElement;
  leftLegCanvas: HTMLCanvasElement;
  rightLegCanvas: HTMLCanvasElement;
  leftArmCanvas: HTMLCanvasElement;
  rightArmCanvas: HTMLCanvasElement;
  tailCanvas: HTMLCanvasElement;
  furPalette: FurEyePalette;
}

interface SideProfileWalkRig {
  fullCanvas: HTMLCanvasElement;
  headCanvas: HTMLCanvasElement;
  torsoCanvas: HTMLCanvasElement;
  frontLeadLegCanvas: HTMLCanvasElement;
  frontTrailLegCanvas: HTMLCanvasElement;
  backLeadLegCanvas: HTMLCanvasElement;
  backTrailLegCanvas: HTMLCanvasElement;
  tailCanvas: HTMLCanvasElement;
}

const DEFAULT_FUR_PALETTE: FurEyePalette = {
  leftLid: '#A5E5DB',
  leftShade: '#76C1B6',
  rightLid: '#6BAEA4',
  rightShade: '#548F86',
};

const cachedRigSprites = new Map<string, KeyedSpriteRig>();
const pendingRigLoads = new Map<string, Promise<KeyedSpriteRig | null>>();
let cachedSideWalkRig: SideProfileWalkRig | null = null;
let pendingSideWalkLoad: Promise<SideProfileWalkRig | null> | null = null;

function createOffscreenCanvas(w = CANVAS_SIZE, h = CANVAS_SIZE): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Edge-connected 4-corner flood-fill white & floor-shadow keyer:
 * - Above `floorShadowTopY`: strips ONLY pure white studio backdrop (`minC > 228 && chroma < 18` or `minC > 235`),
 *   preserving 100% of Barnaby's mint cheeks, gold glasses, white collar/belly, paws, and lavender tail.
 * - In the bottom floor band (`y >= floorShadowTopY` or `y > maxPawY`): strips neutral grey studio floor shadow
 *   (`chroma < 24 && (b - g) < 14 && minC > 130`) beneath and between his paws while keeping purple paws intact.
 * - Gentle 1px white-only edge smoothing (`minC > 220 && chroma < 18`).
 */
function floodFillKeyStudioAndFloorShadow(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  maxPawY = 224,
  floorShadowTopY = 216
): void {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const total = w * h;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);

  let head = 0;
  let tail = 0;

  const isBackdropOrFloorShadow = (idx: number, y: number): boolean => {
    const o = idx * 4;
    if (data[o + 3] === 0) return true;
    if (y > maxPawY) return true;

    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const minC = Math.min(r, g, b);
    const maxC = Math.max(r, g, b);
    const chroma = maxC - minC;

    // Pure white studio backdrop anywhere
    if (minC > 235 || (minC > 228 && chroma < 18)) return true;

    // Neutral grey floor shadow strictly in the bottom floor zone beneath his paws
    if (y >= floorShadowTopY) {
      const isNeutralGrey = chroma < 24 && b - g < 14;
      if (isNeutralGrey && minC > 130) return true;
    }

    return false;
  };

  const enqueue = (idx: number) => {
    if (idx < 0 || idx >= total || visited[idx] !== 0) return;
    const y = (idx - (idx % w)) / w;
    if (isBackdropOrFloorShadow(idx, y)) {
      visited[idx] = 1;
      queue[tail++] = idx;
    }
  };

  // Seed 4 corners & entire perimeter
  enqueue(0);
  enqueue(w - 1);
  enqueue((h - 1) * w);
  enqueue(h * w - 1);

  for (let x = 1; x < w - 1; x++) {
    enqueue(x);
    enqueue((h - 1) * w + x);
  }
  for (let y = 1; y < h - 1; y++) {
    enqueue(y * w);
    enqueue(y * w + (w - 1));
  }

  while (head < tail) {
    const idx = queue[head++];
    const o = idx * 4;
    data[o + 3] = 0;
    visited[idx] = 2;

    const x = idx % w;
    const y = (idx - x) / w;
    if (x > 0) enqueue(idx - 1);
    if (x < w - 1) enqueue(idx + 1);
    if (y > 0) enqueue(idx - w);
    if (y < h - 1) enqueue(idx + w);
  }

  // Sweep bottom floor zone (y >= floorShadowTopY) to clear any enclosed neutral floor shadow between paws
  for (let y = floorShadowTopY; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (visited[idx] === 2) continue;
      const o = idx * 4;
      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      const minC = Math.min(r, g, b);
      const chroma = Math.max(r, g, b) - minC;
      const isNeutralGrey = chroma < 24 && b - g < 14;
      if (y > maxPawY || (isNeutralGrey && minC > 130)) {
        data[o + 3] = 0;
        visited[idx] = 2;
      }
    }
  }

  // Gentle 1px white-only silhouette anti-aliasing (never erases colored fur, glasses, or shirt)
  for (let idx = 0; idx < total; idx++) {
    if (visited[idx] === 2) continue;
    const x = idx % w;
    const y = (idx - x) / w;

    const touchesKeyed =
      (x > 0 && visited[idx - 1] === 2) ||
      (x < w - 1 && visited[idx + 1] === 2) ||
      (y > 0 && visited[idx - w] === 2) ||
      (y < h - 1 && visited[idx + w] === 2);

    if (!touchesKeyed) continue;

    const o = idx * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const minC = Math.min(r, g, b);
    const chroma = Math.max(r, g, b) - minC;

    if (minC > 218 && chroma < 18) {
      const edgeAlpha = Math.max(0, Math.min(1, (232 - minC) / 14)) * 0.65;
      if (edgeAlpha < 0.15) {
        data[o + 3] = 0;
      } else {
        data[o + 3] = Math.round(edgeAlpha * 255);
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Samples the exact surrounding mint-teal fur color right above Barnaby's left and right
 * eye sockets using ctx.getImageData so blinking eyelids blend seamlessly with 3D lighting.
 */
function sampleMintFurEyePalette(ctx: CanvasRenderingContext2D): FurEyePalette {
  const samplePatch = (cx: number, cy: number): [number, number, number] | null => {
    try {
      const img = ctx.getImageData(cx - 4, cy - 3, 9, 7).data;
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let count = 0;
      for (let i = 0; i < img.length; i += 4) {
        const a = img[i + 3];
        const r = img[i];
        const g = img[i + 1];
        const b = img[i + 2];
        // Pick genuine mint-teal fur pixels (ignore dark brows or spectacle rims)
        if (a > 220 && g > r + 14 && g >= b - 8 && r + g + b > 310) {
          rSum += r;
          gSum += g;
          bSum += b;
          count++;
        }
      }
      if (count === 0) return null;
      return [Math.round(rSum / count), Math.round(gSum / count), Math.round(bSum / count)];
    } catch {
      return null;
    }
  };

  const toHex = (r: number, g: number, b: number) =>
    `rgb(${Math.max(0, Math.min(255, r))}, ${Math.max(0, Math.min(255, g))}, ${Math.max(
      0,
      Math.min(255, b)
    )})`;

  const leftRgb = samplePatch(97, 70);
  const rightRgb = samplePatch(124, 70);

  return {
    leftLid: leftRgb ? toHex(leftRgb[0], leftRgb[1], leftRgb[2]) : DEFAULT_FUR_PALETTE.leftLid,
    leftShade: leftRgb
      ? toHex(leftRgb[0] - 32, leftRgb[1] - 30, leftRgb[2] - 22)
      : DEFAULT_FUR_PALETTE.leftShade,
    rightLid: rightRgb ? toHex(rightRgb[0], rightRgb[1], rightRgb[2]) : DEFAULT_FUR_PALETTE.rightLid,
    rightShade: rightRgb
      ? toHex(rightRgb[0] - 26, rightRgb[1] - 26, rightRgb[2] - 20)
      : DEFAULT_FUR_PALETTE.rightShade,
  };
}

/**
 * Splits a keyed 260x260 studio sprite into:
 * - `bodyCanvas` (complete body without right-side tail)
 * - `tailCanvas` (right-side tail plume x > 58% with 6px feathered seam)
 * - Articulated walking sub-layers (`upperTorsoCanvas`, `leftLegCanvas`, `rightLegCanvas`,
 *   `leftArmCanvas`, `rightArmCanvas`) so procedural feline stride walking animates alternating
 *   front/back paws and legs with zero rigid "PNG slide".
 */
function buildBodyAndTailLayers(fullCanvas: HTMLCanvasElement): {
  bodyCanvas: HTMLCanvasElement;
  upperTorsoCanvas: HTMLCanvasElement;
  leftLegCanvas: HTMLCanvasElement;
  rightLegCanvas: HTMLCanvasElement;
  leftArmCanvas: HTMLCanvasElement;
  rightArmCanvas: HTMLCanvasElement;
  tailCanvas: HTMLCanvasElement;
} {
  const bodyCanvas = createOffscreenCanvas();
  const upperTorsoCanvas = createOffscreenCanvas();
  const leftLegCanvas = createOffscreenCanvas();
  const rightLegCanvas = createOffscreenCanvas();
  const leftArmCanvas = createOffscreenCanvas();
  const rightArmCanvas = createOffscreenCanvas();
  const tailCanvas = createOffscreenCanvas();

  const fullCtx = fullCanvas.getContext('2d', { willReadFrequently: true });
  const bodyCtx = bodyCanvas.getContext('2d');
  const upperCtx = upperTorsoCanvas.getContext('2d');
  const lLegCtx = leftLegCanvas.getContext('2d');
  const rLegCtx = rightLegCanvas.getContext('2d');
  const lArmCtx = leftArmCanvas.getContext('2d');
  const rArmCtx = rightArmCanvas.getContext('2d');
  const tailCtx = tailCanvas.getContext('2d');

  if (
    !fullCtx ||
    !bodyCtx ||
    !upperCtx ||
    !lLegCtx ||
    !rLegCtx ||
    !lArmCtx ||
    !rArmCtx ||
    !tailCtx
  ) {
    bodyCtx?.drawImage(fullCanvas, 0, 0);
    upperCtx?.drawImage(fullCanvas, 0, 0);
    return {
      bodyCanvas,
      upperTorsoCanvas,
      leftLegCanvas,
      rightLegCanvas,
      leftArmCanvas,
      rightArmCanvas,
      tailCanvas,
    };
  }

  const src = fullCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  const bodyData = bodyCtx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
  const upperData = upperCtx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
  const lLegData = lLegCtx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
  const rLegData = rLegCtx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
  const lArmData = lArmCtx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
  const rArmData = rArmCtx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
  const tailData = tailCtx.createImageData(CANVAS_SIZE, CANVAS_SIZE);

  const s = src.data;
  const bd = bodyData.data;
  const ud = upperData.data;
  const lld = lLegData.data;
  const rld = rLegData.data;
  const lad = lArmData.data;
  const rad = rArmData.data;
  const td = tailData.data;

  const seamThresholdBase = Math.round(CANVAS_SIZE * 0.58); // 151px (x > 58%)

  for (let y = 0; y < CANVAS_SIZE; y++) {
    // Pass right through the empty white gap between Barnaby's right ear/cheek/hand and his tail plume:
    // y < 106 (ear/cheek): x=168 | y in 106..136 (shoulder): x=162 | y in 136..168 (right hand): x=170 | y >= 168 (hip root): x=152
    const seamX = y < 106 ? 168 : y < 136 ? 162 : y < 168 ? 170 : seamThresholdBase;
    for (let x = 0; x < CANVAS_SIZE; x++) {
      const o = (y * CANVAS_SIZE + x) * 4;
      const a = s[o + 3];
      if (a === 0) continue;

      let tailWeight = 0;
      if (x >= seamX + 2) {
        tailWeight = 1;
      } else if (x > seamX - 2) {
        tailWeight = (x - (seamX - 2)) / 4;
      }
      // Keep a 4px hip under-fill behind the lower tail root (y >= 168) so zero seam gap ever appears
      const bodySeamX = y >= 168 ? seamX + 4 : seamX;
      let bodyWeight = 1;
      if (x >= bodySeamX + 2) {
        bodyWeight = 0;
      } else if (x > bodySeamX - 2) {
        bodyWeight = 1 - (x - (bodySeamX - 2)) / 4;
      }

      if (bodyWeight > 0.01) {
        const bodyAlpha = Math.round(a * bodyWeight);
        bd[o] = s[o];
        bd[o + 1] = s[o + 1];
        bd[o + 2] = s[o + 2];
        bd[o + 3] = bodyAlpha;

        // Partition body into articulated limbs for organic walking stride:
        // 1. Left & right lower legs/paws (y >= 171) split around x = 116
        let legWeight = 0;
        if (y >= 177) {
          legWeight = 1;
        } else if (y > 171) {
          legWeight = (y - 171) / 6;
        }

        // 2. Left & right outer sleeves/hands (y in 126..170)
        let leftArmWeight = 0;
        let rightArmWeight = 0;
        if (y >= 126 && y <= 172) {
          const yArmEnv =
            y < 132 ? (y - 126) / 6 : y > 166 ? (172 - y) / 6 : 1;
          if (x <= 86) {
            leftArmWeight = yArmEnv;
          } else if (x < 92) {
            leftArmWeight = ((92 - x) / 6) * yArmEnv;
          }
          if (x >= 142 && x <= 170) {
            rightArmWeight = yArmEnv;
          } else if (x > 136 && x < 142) {
            rightArmWeight = ((x - 136) / 6) * yArmEnv;
          }
        }

        const torsoWeight = Math.max(0, 1 - legWeight - leftArmWeight - rightArmWeight);

        if (torsoWeight > 0.01) {
          ud[o] = s[o];
          ud[o + 1] = s[o + 1];
          ud[o + 2] = s[o + 2];
          ud[o + 3] = Math.round(bodyAlpha * torsoWeight);
        }

        if (legWeight > 0.01) {
          // Soft 4px horizontal blend at x = 116 between left leg and right leg
          let rightLegRatio = 0;
          if (x >= 118) rightLegRatio = 1;
          else if (x > 114) rightLegRatio = (x - 114) / 4;
          const leftLegRatio = 1 - rightLegRatio;

          if (leftLegRatio > 0.01) {
            lld[o] = s[o];
            lld[o + 1] = s[o + 1];
            lld[o + 2] = s[o + 2];
            lld[o + 3] = Math.round(bodyAlpha * legWeight * leftLegRatio);
          }
          if (rightLegRatio > 0.01) {
            rld[o] = s[o];
            rld[o + 1] = s[o + 1];
            rld[o + 2] = s[o + 2];
            rld[o + 3] = Math.round(bodyAlpha * legWeight * rightLegRatio);
          }
        }

        if (leftArmWeight > 0.01) {
          lad[o] = s[o];
          lad[o + 1] = s[o + 1];
          lad[o + 2] = s[o + 2];
          lad[o + 3] = Math.round(bodyAlpha * leftArmWeight);
        }

        if (rightArmWeight > 0.01) {
          rad[o] = s[o];
          rad[o + 1] = s[o + 1];
          rad[o + 2] = s[o + 2];
          rad[o + 3] = Math.round(bodyAlpha * rightArmWeight);
        }
      }

      if (tailWeight > 0.01) {
        td[o] = s[o];
        td[o + 1] = s[o + 1];
        td[o + 2] = s[o + 2];
        td[o + 3] = Math.round(a * tailWeight);
      }
    }
  }

  bodyCtx.putImageData(bodyData, 0, 0);
  upperCtx.putImageData(upperData, 0, 0);
  lLegCtx.putImageData(lLegData, 0, 0);
  rLegCtx.putImageData(rLegData, 0, 0);
  lArmCtx.putImageData(lArmData, 0, 0);
  rArmCtx.putImageData(rArmData, 0, 0);
  tailCtx.putImageData(tailData, 0, 0);
  return {
    bodyCanvas,
    upperTorsoCanvas,
    leftLegCanvas,
    rightLegCanvas,
    leftArmCanvas,
    rightArmCanvas,
    tailCanvas,
  };
}

function loadKeyedRigSprite(src: string): Promise<KeyedSpriteRig | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  const cached = cachedRigSprites.get(src);
  if (cached) return Promise.resolve(cached);
  const pending = pendingRigLoads.get(src);
  if (pending) return pending;

  const promise = new Promise<KeyedSpriteRig | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const fullCanvas = createOffscreenCanvas();
        const ctx = fullCanvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - side) / 2;
        const sy = (img.naturalHeight - side) / 2;
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

        const maxPawY =
          src === SLEEP_ARTWORK_URL
            ? 214
            : src === GROOM_ARTWORK_URL
            ? 237
            : 224;
        const floorShadowTopY =
          src === SLEEP_ARTWORK_URL
            ? 198
            : src === GROOM_ARTWORK_URL
            ? 224
            : 216;
        floodFillKeyStudioAndFloorShadow(ctx, CANVAS_SIZE, CANVAS_SIZE, maxPawY, floorShadowTopY);
        const furPalette = sampleMintFurEyePalette(ctx);
        const layers = buildBodyAndTailLayers(fullCanvas);

        const rig: KeyedSpriteRig = {
          fullCanvas,
          ...layers,
          furPalette,
        };
        cachedRigSprites.set(src, rig);
        resolve(rig);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

  pendingRigLoads.set(src, promise);
  return promise;
}

/**
 * Builds a 7-part articulated side-profile quadruped walking rig from `/assets/barnaby/walk_profile.jpg`
 * (pre-keyed once on boot with zero per-frame getImageData):
 * - `headCanvas`: side-profile head + gold glasses + ears (`y <= 137`)
 * - `torsoCanvas`: horizontal emerald jacket + mint spine/rump with rounded joint under-fill overlap
 *   at the neck (`y=130..138`), shoulder/hips (`y=184..195`), and tail root (`tailSeamX + 5`) so
 *   rotating limbs never expose a transparent gap
 * - 4 independent quadruped legs split cleanly through the natural empty white spaces between paws:
 *   `frontLeadLegCanvas` (`x < 89`), `frontTrailLegCanvas` (`89 <= x < 122`),
 *   `backLeadLegCanvas` (`122 <= x < 165`), `backTrailLegCanvas` (`x >= 165`)
 * - `tailCanvas`: raised starry lavender tail plume (`y = 32..188`)
 */
function buildSideProfileWalkLayers(fullCanvas: HTMLCanvasElement): SideProfileWalkRig {
  const headCanvas = createOffscreenCanvas();
  const torsoCanvas = createOffscreenCanvas();
  const frontLeadLegCanvas = createOffscreenCanvas();
  const frontTrailLegCanvas = createOffscreenCanvas();
  const backLeadLegCanvas = createOffscreenCanvas();
  const backTrailLegCanvas = createOffscreenCanvas();
  const tailCanvas = createOffscreenCanvas();

  const fullCtx = fullCanvas.getContext('2d', { willReadFrequently: true });
  const headCtx = headCanvas.getContext('2d');
  const torsoCtx = torsoCanvas.getContext('2d');
  const fLeadCtx = frontLeadLegCanvas.getContext('2d');
  const fTrailCtx = frontTrailLegCanvas.getContext('2d');
  const bLeadCtx = backLeadLegCanvas.getContext('2d');
  const bTrailCtx = backTrailLegCanvas.getContext('2d');
  const tailCtx = tailCanvas.getContext('2d');

  if (
    !fullCtx ||
    !headCtx ||
    !torsoCtx ||
    !fLeadCtx ||
    !fTrailCtx ||
    !bLeadCtx ||
    !bTrailCtx ||
    !tailCtx
  ) {
    torsoCtx?.drawImage(fullCanvas, 0, 0);
    return {
      fullCanvas,
      headCanvas,
      torsoCanvas,
      frontLeadLegCanvas,
      frontTrailLegCanvas,
      backLeadLegCanvas,
      backTrailLegCanvas,
      tailCanvas,
    };
  }

  const src = fullCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  const headData = headCtx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
  const torsoData = torsoCtx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
  const fLeadData = fLeadCtx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
  const fTrailData = fTrailCtx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
  const bLeadData = bLeadCtx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
  const bTrailData = bTrailCtx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
  const tailData = tailCtx.createImageData(CANVAS_SIZE, CANVAS_SIZE);

  const s = src.data;
  const hd = headData.data;
  const trd = torsoData.data;
  const fld = fLeadData.data;
  const ftd = fTrailData.data;
  const bld = bLeadData.data;
  const btd = bTrailData.data;
  const tld = tailData.data;

  for (let y = 0; y < CANVAS_SIZE; y++) {
    // Above y=140 tail sits in open space right of x=145; from y=140..172 mint rump slopes from x=166 to x=178
    const tailSeamX =
      y < 140 ? 148 : y < 172 ? Math.round(166 + (y - 140) * 0.38) : 196;
    for (let x = 0; x < CANVAS_SIZE; x++) {
      const o = (y * CANVAS_SIZE + x) * 4;
      const a = s[o + 3];
      if (a === 0) continue;

      let tailW = 0;
      if (y < 186) {
        if (x >= tailSeamX + 2) tailW = 1;
        else if (x > tailSeamX - 2) tailW = (x - (tailSeamX - 2)) / 4;
      }

      if (tailW > 0.01) {
        tld[o] = s[o];
        tld[o + 1] = s[o + 1];
        tld[o + 2] = s[o + 2];
        tld[o + 3] = Math.round(a * tailW);
      }

      // Under-fill rump by 5px behind tail root (y in 140..172) so tail sway never opens a seam
      const bodyTailCutoffX = y >= 140 && y <= 172 ? tailSeamX + 5 : tailSeamX;
      let remW = 1;
      if (y < 186) {
        if (x >= bodyTailCutoffX + 2) remW = 0;
        else if (x > bodyTailCutoffX - 2) remW = 1 - (x - (bodyTailCutoffX - 2)) / 4;
      }
      if (remW <= 0.01) continue;
      const bodyAlpha = Math.round(a * remW);

      // 1. Head layer (y <= 137, x <= 145)
      let headW = 0;
      if (x <= 145) {
        if (y <= 133) headW = 1;
        else if (y < 138) headW = (138 - y) / 5;
      }
      if (headW > 0.01) {
        hd[o] = s[o];
        hd[o + 1] = s[o + 1];
        hd[o + 2] = s[o + 2];
        hd[o + 3] = Math.round(bodyAlpha * headW);
      }

      // 2. Quadruped leg layers (y >= 184, reaching full weight by y = 190)
      let legW = 0;
      if (y >= 190) legW = 1;
      else if (y > 184) legW = (y - 184) / 6;

      if (legW > 0.01) {
        const legAlpha = Math.round(bodyAlpha * legW);
        // Split cleanly through the 3 natural empty gaps between the 4 legs:
        // Front Lead Foreleg: x < 89 | Front Planted Foreleg: 89..122 | Back Inner Hind Leg: 122..165 | Back Outer Hind Leg: >= 165
        if (x < 89) {
          fld[o] = s[o];
          fld[o + 1] = s[o + 1];
          fld[o + 2] = s[o + 2];
          fld[o + 3] = legAlpha;
        } else if (x < 122) {
          ftd[o] = s[o];
          ftd[o + 1] = s[o + 1];
          ftd[o + 2] = s[o + 2];
          ftd[o + 3] = legAlpha;
        } else if (x < 165) {
          bld[o] = s[o];
          bld[o + 1] = s[o + 1];
          bld[o + 2] = s[o + 2];
          bld[o + 3] = legAlpha;
        } else {
          btd[o] = s[o];
          btd[o + 1] = s[o + 1];
          btd[o + 2] = s[o + 2];
          btd[o + 3] = legAlpha;
        }
      }

      // 3. Torso layer with 6px neck under-fill (y >= 131) and 8px shoulder/hip joint cap (fades y=188..195)
      let torsoTopEnv = 1;
      if (x <= 145) {
        if (y <= 130) torsoTopEnv = 0;
        else if (y < 136) torsoTopEnv = (y - 130) / 6;
      }
      let torsoBottomEnv = 1;
      if (y >= 195) torsoBottomEnv = 0;
      else if (y > 188) torsoBottomEnv = (195 - y) / 7;

      const torsoW = torsoTopEnv * torsoBottomEnv;
      if (torsoW > 0.01) {
        trd[o] = s[o];
        trd[o + 1] = s[o + 1];
        trd[o + 2] = s[o + 2];
        trd[o + 3] = Math.round(bodyAlpha * torsoW);
      }
    }
  }

  headCtx.putImageData(headData, 0, 0);
  torsoCtx.putImageData(torsoData, 0, 0);
  fLeadCtx.putImageData(fLeadData, 0, 0);
  fTrailCtx.putImageData(fTrailData, 0, 0);
  bLeadCtx.putImageData(bLeadData, 0, 0);
  bTrailCtx.putImageData(bTrailData, 0, 0);
  tailCtx.putImageData(tailData, 0, 0);

  return {
    fullCanvas,
    headCanvas,
    torsoCanvas,
    frontLeadLegCanvas,
    frontTrailLegCanvas,
    backLeadLegCanvas,
    backTrailLegCanvas,
    tailCanvas,
  };
}

function loadSideProfileWalkRig(): Promise<SideProfileWalkRig | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (cachedSideWalkRig) return Promise.resolve(cachedSideWalkRig);
  if (pendingSideWalkLoad) return pendingSideWalkLoad;

  pendingSideWalkLoad = new Promise<SideProfileWalkRig | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const fullCanvas = createOffscreenCanvas();
        const ctx = fullCanvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - side) / 2;
        const sy = (img.naturalHeight - side) / 2;
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Strip white background + lower floor shadow under all 4 quadruped paws (maxPawY = 228, floorShadowTopY = 210)
        floodFillKeyStudioAndFloorShadow(ctx, CANVAS_SIZE, CANVAS_SIZE, 228, 210);
        cachedSideWalkRig = buildSideProfileWalkLayers(fullCanvas);
        resolve(cachedSideWalkRig);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = WALK_PROFILE_ARTWORK_URL;
  });

  return pendingSideWalkLoad;
}

/**
 * Draws Barnaby's fur-sampled upper eyelid sweep strictly INSIDE his eye sockets
 * when blinkAmount > 0. Native 3D eyes remain 100% untouched whenever blinkAmount === 0.
 * Zero white circles anywhere.
 */
function renderFurSampledEyelids(
  ctx: CanvasRenderingContext2D,
  palette: FurEyePalette,
  blinkAmount: number,
  happyArc: boolean
): void {
  if (blinkAmount <= 0.02) return;

  const eyes = [
    {
      cx: 98.0,
      cy: 82.8,
      rx: 9.2,
      ry: 7.4,
      lidColor: palette.leftLid,
      shadeColor: palette.leftShade,
    },
    {
      cx: 124.8,
      cy: 81.8,
      rx: 9.8,
      ry: 7.4,
      lidColor: palette.rightLid,
      shadeColor: palette.rightShade,
    },
  ];

  for (const eye of eyes) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(eye.cx, eye.cy, eye.rx, eye.ry, 0, 0, Math.PI * 2);
    ctx.clip();

    const lidTopY = eye.cy - eye.ry - 1;
    const sweepH = (eye.ry * 2 + 2) * Math.max(0, Math.min(1, blinkAmount));
    const lidBottomY = lidTopY + sweepH;

    const grad = ctx.createLinearGradient(eye.cx, lidTopY, eye.cx, lidBottomY);
    grad.addColorStop(0, eye.lidColor);
    grad.addColorStop(0.75, eye.lidColor);
    grad.addColorStop(1, eye.shadeColor);

    ctx.fillStyle = grad;
    ctx.fillRect(eye.cx - eye.rx - 2, lidTopY, eye.rx * 2 + 4, sweepH);

    // Soft curved feline closed-lash arc (#2d1b4e) along lower edge of closing fur eyelid
    if (blinkAmount > 0.34) {
      const arcAlpha = Math.min(1, (blinkAmount - 0.34) / 0.35);
      const lashY = Math.min(eye.cy + 2.4, lidBottomY - 0.8);
      const curveOffset = happyArc ? -3.0 : 2.8 * blinkAmount;
      ctx.globalAlpha = arcAlpha * 0.94;
      ctx.strokeStyle = '#2d1b4e';
      ctx.lineWidth = 1.95;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(eye.cx - eye.rx * 0.72, lashY - (happyArc ? -0.6 : 0.7));
      ctx.quadraticCurveTo(
        eye.cx,
        lashY + curveOffset,
        eye.cx + eye.rx * 0.72,
        lashY - (happyArc ? -0.6 : 0.7)
      );
      ctx.stroke();
    }

    ctx.restore();
  }
}

/**
 * Professional Multi-Bone Ribbon Tail Renderer (`renderFluidTailSlices`):
 * - Renders the full vertical tail span (`y = 30..212`) in 22 fine shear-connected ribbon slices
 *   so the upper tip (`y = 36` in `walk_profile.jpg`, `y = 51` in `idle.jpg`) is never clipped.
 * - Welds the tail root (`y >= rootY`) at 0 displacement (`wx = 0, wy = 0`) so the tail base
 *   stays 100% locked to Barnaby's hip/rump with zero seam separation.
 * - Drives a dual-harmonic traveling S-wave (primary caudal sway + phase-delayed tip whip +
 *   arc-length vertical dip) above `rootY` where the tail plume sits in free space.
 */
function renderFluidTailSlices(
  ctx: CanvasRenderingContext2D,
  tailCanvas: HTMLCanvasElement,
  t: number,
  tailSpeed: number,
  tailAmp: number,
  flickBonus: number,
  rootY = 172,
  tailTop = 30,
  tailBottom = 212
): void {
  const sliceCount = 22;
  const sliceH = (tailBottom - tailTop) / sliceCount;
  const freeSpan = Math.max(24, rootY - tailTop);

  const computeWaveAtY = (y: number) => {
    if (y >= rootY) {
      return { wx: 0, wy: 0 };
    }
    // u = 0 at rootY (hip/rump junction), u = 1 at top tip of tail
    const u = Math.max(0, Math.min(1, (rootY - y) / freeSpan));
    // Smooth cantilever stiffness: zero slope & displacement at root, flexible toward tip
    const cantilever = u * u * (2.2 - 1.2 * u);
    const primaryPhaseLag = u * 2.55;
    const whipPhaseLag = u * 4.15;

    const primarySway = Math.sin(t * tailSpeed - primaryPhaseLag);
    const tipWhip = Math.sin(t * tailSpeed - whipPhaseLag) * 0.34 * u;
    const wx =
      (primarySway + tipWhip) * tailAmp * cantilever + flickBonus * Math.pow(u, 1.45);
    const wy =
      Math.cos(t * tailSpeed * 0.9 - primaryPhaseLag * 0.85) * (tailAmp * 0.16) * cantilever +
      Math.abs(wx) * 0.08 * u;
    return { wx, wy };
  };

  // Render from bottom base (sliceCount-1 -> 0) upward to tip with continuous horizontal shear
  for (let i = sliceCount - 1; i >= 0; i--) {
    const sy = tailTop + i * sliceH;
    const midY = sy + sliceH * 0.5;
    const wBottom = computeWaveAtY(sy + sliceH);
    const wTop = computeWaveAtY(sy);
    const wMid = computeWaveAtY(midY);
    const shearX = (wBottom.wx - wTop.wx) / sliceH;

    ctx.save();
    ctx.translate(144 + wMid.wx, midY + wMid.wy);
    ctx.transform(1, 0, shearX, 1, 0, 0);
    ctx.drawImage(
      tailCanvas,
      144,
      sy - 0.9,
      CANVAS_SIZE - 144,
      sliceH + 2.4,
      0,
      -sliceH * 0.5 - 0.9,
      CANVAS_SIZE - 144,
      sliceH + 2.4
    );
    ctx.restore();
  }
}

function drawFourPointGoldStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
  alpha: number
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size * 0.26, cy - size * 0.26);
  ctx.lineTo(cx + size, cy);
  ctx.lineTo(cx + size * 0.26, cy + size * 0.26);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size * 0.26, cy + size * 0.26);
  ctx.lineTo(cx - size, cy);
  ctx.lineTo(cx - size * 0.26, cy - size * 0.26);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function resolveSevenActivity(params: {
  felineBehavior?: BarnabyFelineBehavior;
  explicitAnimationState?: BarnabyAnimationState;
  moodState?: BarnabyMoodState;
  mode: BarnabyMode;
  expression: BarnabyExpression;
  isSleeping: boolean;
  isCurrentlySpeaking: boolean;
  isAffectionate: boolean;
  isPurring: boolean;
  isDragging: boolean;
  locomotion: BarnabyLocomotion;
}): BarnabySevenActivity {
  const b = params.felineBehavior;
  const a = params.explicitAnimationState;

  if (params.isSleeping || b === 'sleeping' || a === 'sleeping' || params.moodState === 'sleepy') {
    return 'sleeping';
  }
  if (b === 'energetic' || a === 'energetic' || a === 'celebratory' || params.moodState === 'celebratory' || params.mode === 'celebration' || params.isAffectionate || params.isPurring) {
    return 'energetic';
  }
  if (b === 'paw-licking' || b === 'grooming' || a === 'paw-licking' || a === 'grooming') {
    return 'paw-licking';
  }
  if (b === 'bored' || a === 'bored' || params.moodState === 'bored') {
    return 'bored';
  }
  if (b === 'walking' || a === 'walking' || (a === 'patrol' && params.locomotion === 'walk') || params.locomotion === 'walk') {
    return 'walking';
  }
  if (b === 'speaking' || a === 'speaking' || params.isCurrentlySpeaking) {
    return 'speaking';
  }
  if (b === 'thinking' || a === 'thinking' || a === 'focused' || params.moodState === 'focused' || params.expression === 'analytical' || params.expression === 'curious') {
    return 'thinking';
  }
  return 'thinking'; // Gentle attentive idle uses calm hover + blinking + fluid tail
}

/**
 * Ground contact shadow disabled so Barnaby renders 100% shadow-free everywhere.
 */
function renderGroundContactShadow(
  _ctx: CanvasRenderingContext2D,
  _centerX: number,
  _groundY: number,
  _baseRx: number,
  _baseRy: number,
  _liftPx: number,
  _alphaScale = 1
): void {
  // Intentionally empty: zero floor shadow under Barnaby
}

/**
 * Renders Barnaby's true side-profile 4-paw quadruped walk cycle (`walk_profile.jpg`)
 * with anatomically constrained diagonal feline gait:
 * - In `walk_profile.jpg`, `frontLeadLeg` (x < 89) and `backLeadLeg` (122..165) are drawn
 *   in the forward-reach pose, while `frontTrailLeg` (89..122) and `backTrailLeg` (>= 165)
 *   are drawn in the rear-planted pose.
 * - Each leg interpolates strictly within `[0..1]` between forward reach and rear stance
 *   so no leg ever hyper-extends beyond its natural anatomical arc.
 * - Paws lift smoothly during forward recovery swing and plant flat on the ground (`y ≈ 225`)
 *   during the backward stance push-off.
 */
function renderSideProfileQuadrupedWalk(
  ctx: CanvasRenderingContext2D,
  sideRig: SideProfileWalkRig,
  stridePhase: number,
  elapsedSec: number,
  tailSpeed: number,
  tailAmp: number,
  speedMult: number,
  gazeRotationDeg = 0
): void {
  // Normalized [0..1] stride progression for diagonal pairs A and B:
  // uA: 0 (forward reach) -> 1 (rear planted) -> 0 (forward reach)
  // uB: opposite phase (1 - uA)
  const cosP = Math.cos(stridePhase);
  const sinP = Math.sin(stridePhase);
  const uA = (1 - cosP) * 0.5;
  const uB = (1 + cosP) * 0.5;

  // Foot lift occurs ONLY when a leg is swinging forward in the air:
  // - Pair A swings forward when sinP < 0 (duA/dt < 0)
  // - Pair B swings forward when sinP > 0 (duB/dt > 0 for Trail, or duB/dt < 0 for Lead)
  const forwardSwingLiftA = Math.max(0, -sinP);
  const forwardSwingLiftB = Math.max(0, sinP);
  const twoBeatBob = Math.abs(sinP);

  // 1. Ground contact shadow directly beneath his 4 stepping paws
  renderGroundContactShadow(ctx, 122, 228, 60, 7.2, twoBeatBob * 3.0, 1.05);

  const drawQuadLimb = (
    limbCanvas: HTMLCanvasElement,
    pivotX: number,
    pivotY: number,
    angleRad: number,
    shiftX: number,
    shiftY: number
  ) => {
    ctx.save();
    ctx.translate(pivotX + shiftX, pivotY + shiftY);
    ctx.rotate(angleRad);
    ctx.translate(-pivotX, -pivotY);
    ctx.drawImage(limbCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.restore();
  };

  // 2. Far-side legs (Front-Lead & Back-Lead) drawn behind torso:
  // Front-Lead starts lifted forward (y=218); as uA goes 0->1 it lowers (+5.5px) to the floor and sweeps back (+5.5px, -0.20 rad)
  drawQuadLimb(
    sideRig.frontLeadLegCanvas,
    76,
    186,
    -uA * 0.20 * speedMult,
    uA * 5.6 * speedMult,
    uA * 5.4 - forwardSwingLiftA * 2.2
  );
  // Back-Lead starts forward under belly; as uB goes 0->1 it sweeps back (+5.2px, -0.17 rad) on the floor, and lifts when returning forward
  drawQuadLimb(
    sideRig.backLeadLegCanvas,
    146,
    186,
    -uB * 0.17 * speedMult,
    uB * 5.2 * speedMult,
    uB * 0.8 - forwardSwingLiftB * 3.4
  );

  // 3. Phase-lagged raised lavender tail trailing organically behind the rump (0.1s delay, -4deg to +4deg sine rotation)
  ctx.save();
  const tailLagPhase = stridePhase - 0.1 * 8.4 * speedMult;
  const tailSineRotRad = Math.sin(tailLagPhase) * ((4 * Math.PI) / 180);
  const rumpBobY = -twoBeatBob * 1.4 + Math.sin(tailLagPhase) * 0.9;
  ctx.translate(166, 160 + rumpBobY);
  ctx.rotate(tailSineRotRad);
  ctx.translate(-166, -160);
  renderFluidTailSlices(
    ctx,
    sideRig.tailCanvas,
    elapsedSec - 0.1,
    tailSpeed,
    tailAmp * 1.25,
    Math.sin(tailLagPhase) * 2.2,
    162,
    30,
    188
  );
  ctx.restore();

  // 4. Horizontal quadruped torso with subtle feline shoulder/hip glide
  ctx.save();
  const spineBobY = -twoBeatBob * 1.5;
  const spinePitchRad = cosP * 0.018 * speedMult;
  ctx.translate(124, 168 + spineBobY);
  ctx.rotate(spinePitchRad);
  ctx.translate(-124, -168);
  ctx.drawImage(sideRig.torsoCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.restore();

  // 5. Near-side legs (Front-Trail & Back-Trail):
  // Front-Trail starts planted vertically (y=226); as uA goes 0->1 (when Front-Lead is sweeping back),
  // Front-Trail lifts (-4.0px) and reaches forward (-5.2px, +0.19 rad)!
  drawQuadLimb(
    sideRig.frontTrailLegCanvas,
    104,
    186,
    uA * 0.19 * speedMult,
    -uA * 5.2 * speedMult,
    -forwardSwingLiftB * 4.0
  );
  // Back-Trail starts extended at rear; as uB goes 0->1 it lifts (-3.6px) and steps forward (-5.0px, +0.17 rad)
  drawQuadLimb(
    sideRig.backTrailLegCanvas,
    178,
    186,
    uB * 0.17 * speedMult,
    -uB * 5.0 * speedMult,
    -forwardSwingLiftA * 3.6
  );

  // 6. Side-profile head with feline stabilizing counter-nod + live cursor gaze-tracking tilt
  ctx.save();
  const headBobY = -twoBeatBob * 1.2 + Math.sin(stridePhase * 2 - 0.45) * 0.7;
  const gazeHeadRad = (gazeRotationDeg * 0.45 * Math.PI) / 180;
  const headNodRad = Math.sin(stridePhase - 0.35) * 0.022 * speedMult + gazeHeadRad;
  ctx.translate(86, 128 + headBobY);
  ctx.rotate(headNodRad);
  ctx.translate(-86, -128);
  ctx.drawImage(sideRig.headCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.restore();
}

/**
 * Renders an articulated multi-joint procedural feline walk cycle from Barnaby's keyed studio rig
 * whenever `/assets/barnaby/walk_profile.jpg` is unavailable:
 */
function renderProceduralArticulatedWalk(
  ctx: CanvasRenderingContext2D,
  rig: KeyedSpriteRig,
  stridePhase: number,
  elapsedSec: number,
  targetBlink: number,
  tailSpeed: number,
  tailAmp: number
): void {
  const swingA = Math.sin(stridePhase); // Left leg & right arm phase
  const swingB = Math.sin(stridePhase + Math.PI); // Right leg & left arm opposite phase
  const liftA = Math.max(0, Math.cos(stridePhase)); // Foot lift during forward step
  const liftB = Math.max(0, Math.cos(stridePhase + Math.PI));
  const twoBeatBob = Math.abs(Math.sin(stridePhase));

  // 1. Phase-lagged tail trailing behind torso stride (0.1s delay, -4deg to +4deg sine rotation)
  ctx.save();
  const tailLagPhase = stridePhase - 0.1 * 8.4;
  const tailSineRotRad = Math.sin(tailLagPhase) * ((4 * Math.PI) / 180);
  ctx.translate(148, 162 - twoBeatBob * 1.5 + Math.cos(tailLagPhase) * 1.1);
  ctx.rotate(tailSineRotRad);
  ctx.translate(-148, -162);
  renderFluidTailSlices(
    ctx,
    rig.tailCanvas,
    elapsedSec - 0.1,
    tailSpeed,
    tailAmp * 1.2,
    Math.sin(tailLagPhase) * 2.0
  );
  ctx.restore();

  // Helper to draw a single pivoted limb
  const drawPivotedLimb = (
    limbCanvas: HTMLCanvasElement,
    pivotX: number,
    pivotY: number,
    angleRad: number,
    shiftX: number,
    shiftY: number
  ) => {
    ctx.save();
    ctx.translate(pivotX + shiftX, pivotY + shiftY);
    ctx.rotate(angleRad);
    ctx.translate(-pivotX, -pivotY);
    ctx.drawImage(limbCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.restore();
  };

  // 2. Back-side limbs first (whichever leg/arm is swinging backward)
  const leftLegAngle = swingA * 0.22;
  const rightLegAngle = swingB * 0.22;
  const leftLegShiftX = -swingA * 3.8;
  const rightLegShiftX = -swingB * 3.8;
  const leftLegLiftY = -liftA * 4.0;
  const rightLegLiftY = -liftB * 4.0;

  if (swingA < 0) {
    drawPivotedLimb(rig.leftLegCanvas, 103, 173, leftLegAngle, leftLegShiftX, leftLegLiftY);
    drawPivotedLimb(rig.rightLegCanvas, 129, 173, rightLegAngle, rightLegShiftX, rightLegLiftY);
  } else {
    drawPivotedLimb(rig.rightLegCanvas, 129, 173, rightLegAngle, rightLegShiftX, rightLegLiftY);
    drawPivotedLimb(rig.leftLegCanvas, 103, 173, leftLegAngle, leftLegShiftX, leftLegLiftY);
  }

  // 3. Counter-swinging back arm
  const leftArmAngle = swingB * 0.14;
  const rightArmAngle = swingA * 0.14;
  drawPivotedLimb(rig.rightArmCanvas, 144, 134, rightArmAngle, -swingA * 2.0, -liftA * 1.6);

  // 4. Upper torso + head with subtle pelvic weight-shift & fur-sampled eyelids
  ctx.save();
  const torsoBobY = -twoBeatBob * 1.8;
  const torsoPitchRad = Math.cos(stridePhase * 2) * 0.018;
  ctx.translate(115, 145 + torsoBobY);
  ctx.rotate(torsoPitchRad);
  ctx.translate(-115, -145);
  ctx.drawImage(rig.upperTorsoCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
  renderFurSampledEyelids(ctx, rig.furPalette, targetBlink, false);
  ctx.restore();

  // 5. Counter-swinging front arm
  drawPivotedLimb(rig.leftArmCanvas, 86, 134, leftArmAngle, -swingB * 2.2, -liftB * 1.8);
}

function deriveMoodState(
  explicitMood: BarnabyMoodState | undefined,
  activity: BarnabySevenActivity,
  expression: BarnabyExpression
): BarnabyMoodState {
  if (explicitMood) return explicitMood;
  switch (activity) {
    case 'energetic':
      return 'celebratory';
    case 'bored':
      return 'bored';
    case 'sleeping':
      return 'sleepy';
    case 'thinking':
      return expression === 'curious' ? 'curious' : 'focused';
    default:
      return 'neutral';
  }
}

/**
 * Crisp Compact Transparent-Keyed Studio Companion (`src/components/BarnabyRig.tsx`).
 * Preserves Barnaby's exact 3D-rendered face, spectacles, emerald jacket & lavender tail from `/assets/barnaby/idle.jpg`
 * (and `walk.mp4` / `groom.jpg` / `sleep.jpg` / `hover.mp4`) with fur-sampled blinking, 14-slice fluid tail wave,
 * and 7 feline activity animations at a compact `w-[76px] h-[76px] sm:w-24 sm:h-24`.
 */
export const BarnabyRig: React.FC<BarnabyRigProps> = ({
  expression = 'neutral',
  mode = 'ambient',
  felineBehavior,
  animationState: explicitAnimationState,
  moodState: explicitMoodState,
  activityId = 'floating_scout',
  spokenText = null,
  cueText = null,
  speakSignal = 0,
  stopSpeakSignal = 0,
  enableVoiceCues = false,
  onSpeakingChange,
  onLipSyncChange,
  locomotion = 'stand',
  walkSpeedFactor = 1,
  facingDirection = 'right',
  isSpeaking = false,
  interactive = true,
  dragVelocity,
  isDragging = false,
  hopSignal = 0,
  affectionSignal = 0,
  isAffectionate = false,
  isSleeping = false,
  isPurring = false,
  showCelestialStars = true,
  gazeRotationDeg = 0,
  gazeOffset = { x: 0, y: 0 },
  onTap,
  className = 'w-full h-full',
  canvasClassName = 'w-[76px] h-[76px] sm:w-24 sm:h-24 pointer-events-none select-none',
  ariaLabel,
  testId = 'barnaby-vector-rig',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const transformContainerRef = useRef<HTMLDivElement | null>(null);
  const walkVideoRef = useRef<HTMLVideoElement | null>(null);
  const hoverVideoRef = useRef<HTMLVideoElement | null>(null);

  const [idleSpriteReady, setIdleSpriteReady] = useState<boolean>(() =>
    cachedRigSprites.has(IDLE_ARTWORK_URL)
  );
  const [loadFailed, setLoadFailed] = useState(false);

  const prevSpeakSignalRef = useRef<number>(speakSignal);
  const prevStopSignalRef = useRef<number>(stopSpeakSignal);
  const prevHopSignalRef = useRef<number>(hopSignal);
  const prevAffectionSignalRef = useRef<number>(affectionSignal);
  const lastAutoCueRef = useRef<string>('');

  const handleHookLipSyncChange = useCallback(
    (state: BarnabyLipSyncState) => {
      onLipSyncChange?.({
        energy: state.rms,
        viseme: state.viseme,
        mouthShapeIndex: state.mouthShapeIndex,
        cheekPuff: state.cheekPuff,
      });
    },
    [onLipSyncChange]
  );

  const { lipSync, speak, stop } = useBarnabyLipSync({
    onSpeakingChange,
    onLipSyncChange: handleHookLipSyncChange,
  });

  const exprConfig = getBarnabyExpressionConfig(expression);
  const activeCue = spokenText ?? cueText ?? null;

  const hopImpulseRef = useRef(0);
  const starBurstRef = useRef(0);
  const [isHopActive, setIsHopActive] = useState(false);
  const hopTimerRef = useRef<number | null>(null);

  const triggerPlayfulHop = useCallback((withStars = false) => {
    hopImpulseRef.current = 1;
    if (withStars) {
      starBurstRef.current = 1;
    }
    setIsHopActive(true);
    if (hopTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(hopTimerRef.current);
    }
    if (typeof window !== 'undefined') {
      hopTimerRef.current = window.setTimeout(() => {
        setIsHopActive(false);
        hopTimerRef.current = null;
      }, 950);
    }
  }, []);

  useEffect(() => {
    if (hopSignal > prevHopSignalRef.current) {
      triggerPlayfulHop(false);
    }
    prevHopSignalRef.current = hopSignal;
  }, [hopSignal, triggerPlayfulHop]);

  useEffect(() => {
    if (affectionSignal > prevAffectionSignalRef.current) {
      triggerPlayfulHop(true);
    }
    prevAffectionSignalRef.current = affectionSignal;
  }, [affectionSignal, triggerPlayfulHop]);

  useEffect(() => {
    return () => {
      if (hopTimerRef.current !== null) window.clearTimeout(hopTimerRef.current);
    };
  }, []);

  const isCurrentlySpeaking = isSpeaking || lipSync.isSpeaking;
  const effectiveLocomotion: BarnabyLocomotion =
    isDragging || isHopActive || isAffectionate ? 'hover' : locomotion;

  const hasExplicitBehavior = Boolean(
    felineBehavior ||
      explicitAnimationState ||
      isSleeping ||
      isCurrentlySpeaking ||
      isAffectionate ||
      isPurring ||
      isDragging ||
      effectiveLocomotion === 'walk'
  );

  const resolvedActivity: BarnabySevenActivity = hasExplicitBehavior
    ? resolveSevenActivity({
        felineBehavior,
        explicitAnimationState,
        moodState: explicitMoodState,
        mode,
        expression,
        isSleeping,
        isCurrentlySpeaking,
        isAffectionate,
        isPurring,
        isDragging,
        locomotion: effectiveLocomotion,
      })
    : mode === 'celebration'
    ? 'energetic'
    : 'thinking';

  const resolvedMoodState = deriveMoodState(explicitMoodState, resolvedActivity, expression);

  const prevActivityRef = useRef(resolvedActivity);
  useEffect(() => {
    if (resolvedActivity === 'energetic' && prevActivityRef.current !== 'energetic') {
      triggerPlayfulHop(true);
    }
    prevActivityRef.current = resolvedActivity;
  }, [resolvedActivity, triggerPlayfulHop]);

  useEffect(() => {
    if (speakSignal > prevSpeakSignalRef.current) {
      prevSpeakSignalRef.current = speakSignal;
      if (activeCue) {
        speak(activeCue);
      }
    }
  }, [speakSignal, activeCue, speak]);

  useEffect(() => {
    if (stopSpeakSignal > prevStopSignalRef.current) {
      prevStopSignalRef.current = stopSpeakSignal;
      stop();
    }
  }, [stopSpeakSignal, stop]);

  useEffect(() => {
    if (!enableVoiceCues || !activeCue) return;
    const trimmed = activeCue.trim();
    if (!trimmed || lastAutoCueRef.current === trimmed) return;
    lastAutoCueRef.current = trimmed;
    speak(trimmed);
  }, [enableVoiceCues, activeCue, speak]);

  // Preload & flood-fill white-key idle.jpg, walk_profile.jpg, groom.jpg, and sleep.jpg once on boot
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadKeyedRigSprite(IDLE_ARTWORK_URL),
      loadSideProfileWalkRig(),
      loadKeyedRigSprite(GROOM_ARTWORK_URL),
      loadKeyedRigSprite(SLEEP_ARTWORK_URL),
    ]).then(([idleRig]) => {
      if (cancelled) return;
      if (idleRig) {
        setIdleSpriteReady(true);
      } else {
        loadKeyedRigSprite(FALLBACK_PNG_URL).then((fallbackRig) => {
          if (cancelled) return;
          if (fallbackRig) setIdleSpriteReady(true);
          else setLoadFailed(true);
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Unlock mobile Chrome <video> autoplay on loadeddata & first pointerdown / touchstart
  const ensureVideosPlaying = useCallback(() => {
    [walkVideoRef.current, hoverVideoRef.current].forEach((v, idx) => {
      if (!v) return;
      v.muted = true;
      v.playsInline = true;
      if (idx === 0) {
        try {
          v.playbackRate = Math.max(0.75, Math.min(1.5, walkSpeedFactor));
        } catch {}
      }
      if (v.paused && v.readyState >= 2) {
        v.play().catch(() => {});
      }
    });
  }, [walkSpeedFactor]);

  useEffect(() => {
    ensureVideosPlaying();
    if (typeof window === 'undefined') return;
    const onGesture = () => ensureVideosPlaying();
    window.addEventListener('pointerdown', onGesture, { passive: true });
    window.addEventListener('touchstart', onGesture, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('touchstart', onGesture);
    };
  }, [ensureVideosPlaying, resolvedActivity]);

  const livePropsRef = useRef({
    activity: resolvedActivity,
    hasExplicitIdle: !hasExplicitBehavior && mode === 'ambient',
    interactive,
    facingDirection,
    walkSpeedFactor,
    isDragging,
    isCurrentlySpeaking,
    speechRms: lipSync.rms,
    syllableStress: lipSync.syllableStress,
    showCelestialStars,
    dragVelocity: dragVelocity ?? { vx: 0, vy: 0 },
    gazeRotationDeg,
    gazeOffset,
  });
  livePropsRef.current = {
    activity: resolvedActivity,
    hasExplicitIdle: !hasExplicitBehavior && mode === 'ambient',
    interactive,
    facingDirection,
    walkSpeedFactor,
    isDragging,
    isCurrentlySpeaking,
    speechRms: lipSync.rms,
    syllableStress: lipSync.syllableStress,
    showCelestialStars,
    dragVelocity: dragVelocity ?? { vx: 0, vy: 0 },
    gazeRotationDeg,
    gazeOffset,
  };

  const walkCacheRef = useRef<{
    canvas: HTMLCanvasElement | null;
    ctx: CanvasRenderingContext2D | null;
    lastVideoTime: number;
    hoverCanvas: HTMLCanvasElement | null;
    hoverCtx: CanvasRenderingContext2D | null;
    lastHoverTime: number;
  }>({
    canvas: null,
    ctx: null,
    lastVideoTime: -1,
    hoverCanvas: null,
    hoverCtx: null,
    lastHoverTime: -1,
  });

  // 60FPS Transparent-Keyed Canvas Render Loop:
  // - Native 3D face + fur-sampled 140ms blinks every 3.2-4.8s (zero white circles)
  // - Fluid 14-slice tail wave (x > 58%)
  // - 7 feline activity animations + GPU container transforms
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === 'undefined') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let disposed = false;
    let rafId = 0;
    let lastTs = performance.now();
    const startTs = lastTs;

    // 140ms blink timer cycling cleanly every 3.2s - 4.8s
    let blinkState = {
      nextBlinkAt: lastTs + 3200 + Math.random() * 1400,
      blinkStartAt: -1,
    };

    // 260ms smooth pose transition state (prevents 1-frame pop between upright, side-walk, grooming & curled sleep)
    let poseTransition = {
      lastActivity: livePropsRef.current.activity as BarnabySevenActivity,
      prevActivity: livePropsRef.current.activity as BarnabySevenActivity,
      transitionStartAt: -1,
    };

    // Monotonically integrated phases (prevents phase jumps when walkSpeedFactor or tailSpeed changes!)
    let stridePhase = 0;
    let tailPhase = 0;
    let smoothTailSpeed = 2.4;
    let smoothTailAmp = 3.6;

    const drawSingleActivityPose = (
      actToDraw: BarnabySevenActivity,
      elapsedSec: number,
      curStridePhase: number,
      curTailPhase: number,
      targetBlink: number,
      curTailAmp: number,
      boredFlickBonus: number,
      speedMult: number,
      facingDir: 'left' | 'right',
      idleRig: KeyedSpriteRig | null,
      sideWalkRig: SideProfileWalkRig | null,
      groomRig: KeyedSpriteRig | null,
      sleepRig: KeyedSpriteRig | null
    ) => {
      // Flip horizontally ONLY during directional walking patrol when facing right
      const shouldFlipWalkRight = actToDraw === 'walking' && facingDir === 'right';

      ctx.save();
      if (shouldFlipWalkRight) {
        ctx.translate(CANVAS_SIZE, 0);
        ctx.scale(-1, 1);
      }

      if (actToDraw === 'walking') {
        if (sideWalkRig) {
          renderSideProfileQuadrupedWalk(
            ctx,
            sideWalkRig,
            curStridePhase,
            curTailPhase,
            1,
            curTailAmp,
            speedMult,
            livePropsRef.current.gazeRotationDeg
          );
        } else if (idleRig) {
          renderGroundContactShadow(
            ctx,
            116,
            228,
            42,
            6.5,
            Math.abs(Math.sin(curStridePhase)) * 3.5,
            1
          );
          renderProceduralArticulatedWalk(
            ctx,
            idleRig,
            curStridePhase,
            curTailPhase,
            targetBlink,
            1,
            curTailAmp
          );
        }
      } else if (actToDraw === 'sleeping') {
        renderGroundContactShadow(ctx, 134, 224, 72, 9.5, 0, 1.15);
        if (sleepRig) {
          // Render curled sleep.jpg intact (its tail wraps across x=118..245 so never slice at x=146)
          ctx.drawImage(sleepRig.fullCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
        } else if (idleRig) {
          ctx.drawImage(idleRig.bodyCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
          renderFurSampledEyelids(ctx, idleRig.furPalette, 1.0, false);
          renderFluidTailSlices(ctx, idleRig.tailCanvas, curTailPhase, 1, curTailAmp, 0);
        }
      } else if (actToDraw === 'paw-licking') {
        renderGroundContactShadow(
          ctx,
          115,
          232,
          44,
          6.8,
          Math.max(0, Math.sin(elapsedSec * 4.6)) * 2.5,
          1.0
        );
        if (groomRig) {
          // groom.jpg already renders Barnaby's native smiling half-closed eyes & raised chin paw
          ctx.drawImage(groomRig.bodyCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
          renderFluidTailSlices(ctx, groomRig.tailCanvas, curTailPhase, 1, curTailAmp, 0);
        } else if (idleRig) {
          ctx.drawImage(idleRig.bodyCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
          renderFurSampledEyelids(ctx, idleRig.furPalette, targetBlink, true);
          renderFluidTailSlices(ctx, idleRig.tailCanvas, curTailPhase, 1, curTailAmp, 0);
        }
      } else {
        // idle / thinking / speaking / energetic / bored -> clean pre-keyed idle.jpg + shear-connected tail
        const hoverLift =
          actToDraw === 'energetic'
            ? Math.abs(Math.sin(elapsedSec * 6.8)) * 7.0
            : Math.sin((elapsedSec * Math.PI * 2) / 3.2) * 3.0 + 3.0;
        renderGroundContactShadow(ctx, 115, 229, 40, 6.2, hoverLift, 0.92);

        if (idleRig) {
          ctx.drawImage(idleRig.bodyCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
          renderFurSampledEyelids(ctx, idleRig.furPalette, targetBlink, false);
          renderFluidTailSlices(
            ctx,
            idleRig.tailCanvas,
            curTailPhase,
            1,
            curTailAmp,
            boredFlickBonus
          );
        }
      }

      ctx.restore();
    };

    const renderFrame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.004, (now - lastTs) / 1000));
      lastTs = now;
      const elapsedSec = (now - startTs) / 1000;
      const st = livePropsRef.current;
      const act = st.activity;

      // Detect activity changes to trigger a smooth 260ms cross-dissolve + landing squash-and-stretch when returning to idle
      if (act !== poseTransition.lastActivity) {
        poseTransition.prevActivity = poseTransition.lastActivity;
        poseTransition.lastActivity = act;
        poseTransition.transitionStartAt = now;
      }

      let transitionBlend = 1;
      let transitionSquash = 0;
      let landingSquashY = 1;
      let landingStretchX = 1;
      let landingOffsetY = 0;
      if (!prefersReducedMotion && poseTransition.transitionStartAt >= 0) {
        const transElapsed = now - poseTransition.transitionStartAt;
        const isReturningToIdle =
          act === 'thinking' ||
          act === 'bored' ||
          act === 'paw-licking' ||
          (poseTransition.prevActivity === 'walking' && act !== 'walking') ||
          (poseTransition.prevActivity === 'energetic' && act !== 'energetic');
        const durationMs = isReturningToIdle ? 420 : 260;

        if (transElapsed >= durationMs) {
          poseTransition.transitionStartAt = -1;
          transitionBlend = 1;
        } else {
          const rawT = Math.max(0, Math.min(1, transElapsed / durationMs));
          transitionBlend = rawT * rawT * (3 - 2 * rawT);

          if (isReturningToIdle) {
            // Subtle vertical squash-and-stretch landing curve:
            // Phase 1 (0..0.45): vertical compression squash (scaleY down to 0.90, scaleX out to 1.08, y down +3.2px)
            // Phase 2 (0.45..0.82): elastic rebound stretch (scaleY up to 1.045, scaleX in to 0.97, y up -1.4px)
            // Phase 3 (0.82..1.0): smooth settle back to 1.0
            const damp = Math.exp(-3.4 * rawT);
            const wave = Math.sin(rawT * Math.PI * 2.1);
            landingSquashY = 1 - 0.115 * wave * damp;
            landingStretchX = 1 + 0.095 * wave * damp;
            landingOffsetY = 3.4 * wave * damp;
          } else {
            transitionSquash = Math.sin(rawT * Math.PI);
          }
        }
      }

      if (hopImpulseRef.current > 0.001) {
        hopImpulseRef.current = Math.max(0, hopImpulseRef.current - dt * 1.45);
      }
      if (starBurstRef.current > 0.001) {
        starBurstRef.current = Math.max(0, starBurstRef.current - dt * 0.65);
      }

      // Compute smooth 140ms blink envelope (3.2s - 4.8s intervals)
      let autoBlink = 0;
      if (!prefersReducedMotion) {
        if (blinkState.blinkStartAt < 0 && now >= blinkState.nextBlinkAt) {
          blinkState.blinkStartAt = now;
        }
        if (blinkState.blinkStartAt >= 0) {
          const blinkElapsed = now - blinkState.blinkStartAt;
          if (blinkElapsed >= 140) {
            blinkState.blinkStartAt = -1;
            blinkState.nextBlinkAt = now + 3200 + Math.random() * 1600;
          } else {
            autoBlink = Math.sin((blinkElapsed / 140) * Math.PI);
          }
        }
      }

      // Eyelid state per activity
      const targetBlink =
        act === 'sleeping'
          ? 1.0
          : act === 'paw-licking'
          ? 1.0
          : act === 'bored'
          ? Math.max(0.56, autoBlink)
          : autoBlink;

      // Target tail harmonic speed & amplitude per activity (smoothed continuously via dt)
      const targetTailSpeed =
        act === 'energetic'
          ? 6.4
          : act === 'paw-licking'
          ? 3.0
          : act === 'bored'
          ? 1.25
          : act === 'sleeping'
          ? 0.85
          : act === 'walking'
          ? 4.4
          : 2.3;
      const targetTailAmp =
        act === 'energetic'
          ? 7.2
          : act === 'paw-licking'
          ? 4.0
          : act === 'bored'
          ? 2.2
          : act === 'sleeping'
          ? 1.2
          : act === 'walking'
          ? 4.6
          : 3.8;

      const lerpAlpha = Math.min(1, dt * 7.5);
      smoothTailSpeed += (targetTailSpeed - smoothTailSpeed) * lerpAlpha;
      smoothTailAmp += (targetTailAmp - smoothTailAmp) * lerpAlpha;

      const speedMult = Math.max(0.55, Math.min(1.4, st.walkSpeedFactor));
      if (!prefersReducedMotion) {
        tailPhase += dt * smoothTailSpeed;
        if (act === 'walking' || poseTransition.prevActivity === 'walking') {
          stridePhase += dt * 8.4 * speedMult;
        }
      }

      const boredFlickBonus =
        act === 'bored' ? Math.pow(Math.max(0, Math.sin(elapsedSec * 1.15)), 5) * 4.5 : 0;

      // 1. Smooth GPU transform container kinematics across all 7 activities
      const transformEl = transformContainerRef.current;
      if (transformEl) {
        if (prefersReducedMotion) {
          transformEl.style.transform = 'translate3d(0px, 0px, 0px) scale(1) rotate(0deg)';
        } else {
          const cyclePhase = (elapsedSec * Math.PI * 2) / 3.2;
          let yPx = Math.sin(cyclePhase) * 3.0;
          let scaleX = 1;
          let scaleY = 1.0 + ((Math.sin(cyclePhase) + 1) * 0.5) * 0.025;
          let rotDeg = 0;

          if (act === 'walking') {
            // Grounded two-beat feline stride bounce synced with paw dust emitter (zero double-wobble)
            const twoBeatBounce = Math.abs(Math.sin(stridePhase));
            yPx = (-twoBeatBounce * 2.2 + 0.4) * speedMult;
            const dirSign = st.facingDirection === 'right' ? 1 : -1;
            rotDeg = (dirSign * 1.0 + Math.cos(stridePhase) * 0.85) * speedMult;
            scaleY = 0.992 + twoBeatBounce * 0.018;
            scaleX = 1.008 - twoBeatBounce * 0.01;
          } else if (act === 'paw-licking') {
            const lickBob = Math.sin(elapsedSec * 4.6);
            yPx = Math.max(0, lickBob) * 3.0;
            rotDeg = -3.5 + Math.sin(elapsedSec * 2.3) * 3.2;
            scaleY = 1.01 + Math.sin(elapsedSec * 1.8) * 0.018 - Math.max(0, lickBob) * 0.014;
          } else if (act === 'energetic') {
            const springHop = Math.abs(Math.sin(elapsedSec * 6.8));
            yPx = -springHop * 8.0;
            rotDeg = Math.sin(elapsedSec * 3.4) * 5.8;
            scaleY = 0.975 + springHop * 0.055;
            scaleX = 1.022 - springHop * 0.026;
          } else if (act === 'bored') {
            const sigh = Math.pow(Math.max(0, Math.sin(elapsedSec * 1.35)), 2.2);
            yPx = 2.2 + sigh * 3.0;
            rotDeg = -5.8 - sigh * 2.2;
            scaleY = 0.98 - sigh * 0.022;
            scaleX = 1.015 + sigh * 0.012;
          } else if (act === 'sleeping') {
            yPx = 4.0 + Math.sin(elapsedSec * 0.95) * 1.2;
            rotDeg = 0;
            scaleY = 1.0 + Math.sin(elapsedSec * 0.95) * 0.038;
            scaleX = 1.0 - Math.sin(elapsedSec * 0.95) * 0.012;
          } else if (act === 'speaking') {
            const nod = Math.sin(elapsedSec * 9.5) * (2.4 + st.speechRms * 2.6);
            yPx = -Math.abs(Math.sin(elapsedSec * 8.2)) * (2.0 + st.speechRms * 2.4);
            rotDeg = nod * 0.9;
            scaleY = 1.024 + st.syllableStress * 0.02;
            scaleX = 1.02;
          } else if (act === 'thinking') {
            yPx = Math.sin(cyclePhase) * 2.8;
            rotDeg = st.hasExplicitIdle ? 0 : Math.sin(elapsedSec * 1.4) * 3.2;
            scaleY = st.hasExplicitIdle
              ? 1.0 + ((Math.sin(cyclePhase) + 1) * 0.5) * 0.025
              : 1.025 + Math.sin(cyclePhase) * 0.014;
            scaleX = st.hasExplicitIdle ? 1.0 : 1.02;
          }

          // Smooth pose-change cushion & vertical landing squash-and-stretch when returning to idle
          if (transitionSquash > 0.01) {
            yPx += transitionSquash * 1.8;
            scaleY *= 1 - transitionSquash * 0.032;
            scaleX *= 1 + transitionSquash * 0.022;
          }
          if (Math.abs(landingSquashY - 1) > 0.001 || Math.abs(landingOffsetY) > 0.01) {
            yPx += landingOffsetY;
            scaleY *= landingSquashY;
            scaleX *= landingStretchX;
          }

          // Extra hop impulse (with landing squash at tail of hop) & drag lean follow-through + cursor gaze tilt
          if (hopImpulseRef.current > 0.01) {
            const hp = (1 - hopImpulseRef.current) * Math.PI;
            yPx -= Math.sin(hp) * 8.0 * hopImpulseRef.current;
            rotDeg += Math.sin(hp * 2) * 7.0 * hopImpulseRef.current;
            // Landing squash during final 30% of hop return to idle
            if (hopImpulseRef.current < 0.32) {
              const landP = (0.32 - hopImpulseRef.current) / 0.32;
              const landPulse = Math.sin(landP * Math.PI);
              scaleY *= 1 - landPulse * 0.085;
              scaleX *= 1 + landPulse * 0.068;
              yPx += landPulse * 2.4;
            }
          }
          rotDeg += Math.max(-8, Math.min(8, st.dragVelocity.vx * 0.008));
          if (act !== 'sleeping') {
            rotDeg += st.gazeRotationDeg * 0.35;
          }

          transformEl.style.transform = `translate3d(0px, ${yPx.toFixed(
            2
          )}px, 0px) scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)}) rotate(${rotDeg.toFixed(
            2
          )}deg)`;
        }
      }

      // 2. Render crisp 260x260 transparent-keyed artwork onto canvas (zero per-frame getImageData!)
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const idleRig =
        cachedRigSprites.get(IDLE_ARTWORK_URL) ??
        cachedRigSprites.get(FALLBACK_PNG_URL) ??
        null;
      const sideWalkRig = cachedSideWalkRig;
      const groomRig = cachedRigSprites.get(GROOM_ARTWORK_URL) ?? null;
      const sleepRig = cachedRigSprites.get(SLEEP_ARTWORK_URL) ?? null;

      if (transitionBlend < 0.99 && poseTransition.prevActivity !== act) {
        ctx.save();
        ctx.globalAlpha = 1 - transitionBlend;
        drawSingleActivityPose(
          poseTransition.prevActivity,
          elapsedSec,
          stridePhase,
          tailPhase,
          targetBlink,
          smoothTailAmp,
          boredFlickBonus,
          speedMult,
          st.facingDirection,
          idleRig,
          sideWalkRig,
          groomRig,
          sleepRig
        );
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = transitionBlend;
        drawSingleActivityPose(
          act,
          elapsedSec,
          stridePhase,
          tailPhase,
          targetBlink,
          smoothTailAmp,
          boredFlickBonus,
          speedMult,
          st.facingDirection,
          idleRig,
          sideWalkRig,
          groomRig,
          sleepRig
        );
        ctx.restore();
      } else {
        drawSingleActivityPose(
          act,
          elapsedSec,
          stridePhase,
          tailPhase,
          targetBlink,
          smoothTailAmp,
          boredFlickBonus,
          speedMult,
          st.facingDirection,
          idleRig,
          sideWalkRig,
          groomRig,
          sleepRig
        );
      }

      // 3. Mood/activity particles (never flipped, never covering Barnaby's face)
      if (act === 'sleeping') {
        ctx.save();
        const z1Y = 58 - ((elapsedSec * 14) % 24);
        const z2Y = 38 - (((elapsedSec + 0.8) * 14) % 24);
        ctx.font = '800 15px sans-serif';
        ctx.fillStyle = '#F59E0B';
        ctx.globalAlpha = 0.9;
        ctx.fillText('z', 188 + Math.sin(elapsedSec * 1.8) * 3.5, z1Y);
        ctx.font = '800 19px sans-serif';
        ctx.fillStyle = '#FDE68A';
        ctx.globalAlpha = 0.95;
        ctx.fillText('Z', 206 + Math.cos(elapsedSec * 1.5) * 4.5, z2Y);
        ctx.restore();
      } else if (act === 'bored') {
        // Tiny floating "..." thought dots while bored
        ctx.save();
        for (let i = 0; i < 3; i++) {
          const dotAlpha = 0.42 + 0.45 * Math.sin(elapsedSec * 2.2 - i * 0.7);
          const dy = Math.sin(elapsedSec * 1.5 - i * 0.5) * 2.5;
          ctx.globalAlpha = Math.max(0.2, dotAlpha);
          ctx.fillStyle = '#64748B';
          ctx.beginPath();
          ctx.arc(178 + i * 9, 44 + dy, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (
        st.showCelestialStars &&
        (act === 'energetic' || act === 'paw-licking' || starBurstRef.current > 0.02)
      ) {
        const burst = Math.max(
          starBurstRef.current,
          act === 'energetic' ? 0.95 : act === 'paw-licking' ? 0.45 : 0
        );
        drawFourPointGoldStar(
          ctx,
          216 + Math.cos(elapsedSec * 2.4) * 8,
          44 + Math.sin(elapsedSec * 2.6) * 6,
          6.8 + burst * 2.5,
          '#F59E0B',
          Math.min(0.96, 0.48 + burst * 0.48)
        );
        drawFourPointGoldStar(
          ctx,
          36 + Math.sin(elapsedSec * 2.2) * 7,
          68 + Math.cos(elapsedSec * 2.3) * 6,
          5.8 + burst * 2.2,
          '#FDE68A',
          Math.min(0.95, 0.44 + burst * 0.48)
        );
        if (act === 'energetic' || starBurstRef.current > 0.15) {
          drawFourPointGoldStar(
            ctx,
            210 + Math.sin(elapsedSec * 2.8 + 1.2) * 7,
            190 + Math.cos(elapsedSec * 2.1) * 6,
            5.6 + burst * 2.0,
            '#FDE68A',
            Math.min(0.92, 0.44 + burst * 0.46)
          );
        }
      }
    };

    if (prefersReducedMotion) {
      renderFrame(performance.now());
      return;
    }

    const tick = (now: number) => {
      if (disposed) return;
      renderFrame(now);
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);

    return () => {
      disposed = true;
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [idleSpriteReady]);

  const handleClick = () => {
    if (!onTap) return;
    triggerPlayfulHop(false);
    onTap();
  };

  return (
    <div
      onClick={interactive && onTap ? handleClick : undefined}
      role="img"
      aria-label={
        ariaLabel || `Barnaby companion (${exprConfig.statusLabel}, ${resolvedMoodState})`
      }
      data-testid={testId}
      data-character="barnaby-celestial-familiar"
      data-renderer={loadFailed ? 'canvas-chromakey-crest' : 'canvas-7-activity-studio'}
      data-locomotion={effectiveLocomotion}
      data-facing={facingDirection}
      data-expression={expression}
      data-barnaby-mode={mode}
      data-barnaby-behavior={resolvedActivity}
      data-barnaby-mood-state={resolvedMoodState}
      data-barnaby-animation-state={resolvedActivity}
      data-barnaby-activity={activityId}
      data-barnaby-sleeping={resolvedActivity === 'sleeping' || isSleeping ? 'true' : 'false'}
      data-barnaby-purring={isPurring ? 'true' : 'false'}
      data-barnaby-speaking={isCurrentlySpeaking ? 'true' : 'false'}
      data-barnaby-lipsync={lipSync.viseme}
      data-barnaby-mouth-shape={lipSync.mouthShapeIndex}
      data-barnaby-cheek-puff={lipSync.cheekPuff.toFixed(2)}
      data-barnaby-speech-level={lipSync.rms.toFixed(2)}
      className={`relative select-none flex items-center justify-center ${
        interactive && onTap ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Hidden studio loops decoded onto the flood-fill white-keyed 260x260 canvas (interactive rigs only) */}
      {interactive && (
        <>
          <video
            ref={walkVideoRef}
            src={WALK_VIDEO_URL}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onLoadedData={ensureVideosPlaying}
            onCanPlay={ensureVideosPlaying}
            className="absolute inset-0 w-full h-full opacity-[0.001] pointer-events-none -z-10"
            aria-hidden="true"
          />
          <video
            ref={hoverVideoRef}
            src={HOVER_VIDEO_URL}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onLoadedData={ensureVideosPlaying}
            onCanPlay={ensureVideosPlaying}
            className="absolute inset-0 w-full h-full opacity-[0.001] pointer-events-none -z-10"
            aria-hidden="true"
          />
        </>
      )}

      <div
        ref={transformContainerRef}
        className="will-change-transform flex items-center justify-center"
      >
        <div
          data-testid="barnaby-rig-look-head"
          data-gaze-tracking={
            resolvedActivity !== 'sleeping' && Math.abs(gazeRotationDeg) > 0.05
              ? 'true'
              : 'false'
          }
          data-gaze-rotation={gazeRotationDeg.toFixed(2)}
          style={
            {
              '--barnaby-gaze-rotate': `${
                resolvedActivity === 'sleeping' ? '0.00' : gazeRotationDeg.toFixed(2)
              }deg`,
              '--barnaby-gaze-x': `${
                resolvedActivity === 'sleeping' ? '0.00' : gazeOffset.x.toFixed(2)
              }px`,
              '--barnaby-gaze-y': `${
                resolvedActivity === 'sleeping' ? '0.00' : gazeOffset.y.toFixed(2)
              }px`,
            } as React.CSSProperties
          }
          className="barnaby-rig-look-head flex items-center justify-center"
        >
          {!loadFailed ? (
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              data-testid="barnaby-chromakey-canvas"
              className={canvasClassName}
            />
          ) : (
            <div
              data-testid="barnaby-missing-sprite-fallback"
              className="w-16 h-16 rounded-full bg-[#134E41]/95 border border-[#F59E0B]/70 flex items-center justify-center"
            >
              <BarnabyCrest size={34} variant="inline" animated />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
