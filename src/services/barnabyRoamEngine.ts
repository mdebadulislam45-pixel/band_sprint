/**
 * Barnaby Roam Engine — Lightweight Spatial Intelligence, Obstacle Avoidance & Event Bus
 *
 * Powers Barnaby's autonomous floating desktop-pet movement across BandSprint:
 * - Zero heavy dependencies (pure geometry + throttled DOM rect sampling)
 * - Understands interactive obstacles (buttons, inputs, dialogs, menus, exam elements)
 * - Computes smooth, organic flight destinations, resting perches, approach spots, and evasive glides
 * - Adapts cleanly across desktop (1360x768+) and mobile (360-430px) viewports
 */

export const BARNABY_LOCOMOTION_STATES = [
  'perched',
  'flying',
  'hovering',
  'landing',
  'walking',
  'looking',
  'sleeping',
  'dragging'
] as const;

export type BarnabyLocomotionState = (typeof BARNABY_LOCOMOTION_STATES)[number];

export type BarnabyFacing = 'left' | 'right';

export interface BarnabyPoint {
  x: number;
  y: number;
}

export interface BarnabySize {
  width: number;
  height: number;
}

export interface BarnabyRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  priority?: 'normal' | 'high' | 'critical';
}

export interface BarnabyViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  size: BarnabySize;
}

export type BarnabyCompanionEventType =
  | 'dashboard_enter'
  | 'achievement'
  | 'task_completed'
  | 'mistake_detected'
  | 'study_encouragement'
  | 'summon'
  | 'hide'
  | 'pause_roam'
  | 'resume_roam';

export interface BarnabyCompanionEventDetail {
  type: BarnabyCompanionEventType;
  message?: string;
  skill?: string;
  route?: string;
}

export const BARNABY_COMPANION_EVENT = 'bandsprint_barnaby_companion_event';

/**
 * Dispatches a structured companion event so Barnaby reacts organically to learning moments.
 */
export function dispatchBarnabyEvent(
  type: BarnabyCompanionEventType,
  detail?: Omit<BarnabyCompanionEventDetail, 'type'>
): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent<BarnabyCompanionEventDetail>(BARNABY_COMPANION_EVENT, {
        detail: { type, ...detail }
      })
    );
  } catch {
    // Safe no-op in non-DOM test environments
  }
}

/**
 * Responsive unclipped full-body dragon dimensions.
 * Expressive enough to read as a living companion without obscuring interface controls.
 */
export function getBarnabySize(viewportWidth: number): BarnabySize {
  if (viewportWidth < 640) {
    return { width: 76, height: 84 };
  }
  if (viewportWidth < 1024) {
    return { width: 88, height: 96 };
  }
  return { width: 96, height: 106 };
}

/**
 * Computes safe viewport bounds respecting app header, mobile bottom navigation, and outer gutters.
 */
export function getSafeViewportBounds(
  viewportWidth: number,
  viewportHeight: number
): BarnabyViewportBounds {
  const safeW = Math.max(320, Math.round(viewportWidth || 1280));
  const safeH = Math.max(480, Math.round(viewportHeight || 768));
  const size = getBarnabySize(safeW);
  const isMobile = safeW < 768;

  const edgePad = isMobile ? 10 : 14;
  const headerClearance = isMobile ? 64 : 70;
  const bottomClearance = isMobile ? 84 : 18;

  const minX = edgePad;
  const maxX = Math.max(minX, safeW - size.width - edgePad);
  const minY = headerClearance;
  const maxY = Math.max(minY, safeH - size.height - bottomClearance);

  return { minX, maxX, minY, maxY, size };
}

/**
 * Clamps any coordinate strictly inside the visible safe viewport bounds.
 */
export function clampBarnabyPosition(
  pos: BarnabyPoint,
  viewportWidth: number,
  viewportHeight: number
): BarnabyPoint {
  const bounds = getSafeViewportBounds(viewportWidth, viewportHeight);
  return {
    x: Math.round(Math.max(bounds.minX, Math.min(bounds.maxX, pos.x))),
    y: Math.round(Math.max(bounds.minY, Math.min(bounds.maxY, pos.y)))
  };
}

/**
 * Computes rectangle intersection area in px^2.
 */
export function computeOverlapArea(a: BarnabyRect, b: BarnabyRect): number {
  const xOverlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  if (xOverlap <= 0) return 0;
  const yOverlap = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return xOverlap * yOverlap;
}

/**
 * Builds Barnaby's bounding rectangle at a candidate top-left position.
 */
export function getBarnabyRectAt(pos: BarnabyPoint, size: BarnabySize): BarnabyRect {
  return {
    left: pos.x,
    top: pos.y,
    right: pos.x + size.width,
    bottom: pos.y + size.height
  };
}

/**
 * Samples visible interactive/blocking elements in the DOM to create avoidance zones.
 * Runs only on-demand (when choosing a new destination, opening dialogs, focusing inputs, or resizing)
 * to keep CPU/GPU overhead negligible on Intel i5-6200U / HD 520.
 */
export function collectScreenObstacles(doc?: Document): BarnabyRect[] {
  const targetDoc = doc || (typeof document !== 'undefined' ? document : undefined);
  if (!targetDoc || typeof targetDoc.querySelectorAll !== 'function') return [];

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  const obstacles: BarnabyRect[] = [];

  const pushRect = (rect: DOMRect, pad: number, priority: BarnabyRect['priority']) => {
    if (rect.width < 8 || rect.height < 8) return;
    if (rect.right <= 0 || rect.bottom <= 0 || rect.left >= vw || rect.top >= vh) return;
    // Ignore giant full-screen wrappers that cover >85% of viewport unless they are actual modals/dialogs
    if (priority === 'normal' && rect.width > vw * 0.85 && rect.height > vh * 0.85) return;
    obstacles.push({
      left: rect.left - pad,
      top: rect.top - pad,
      right: rect.right + pad,
      bottom: rect.bottom + pad,
      priority
    });
  };

  // 1. Critical obstacles: open modals, dialogs, popovers, active inputs, exam containers
  const criticalSelector =
    '[role="dialog"], [aria-modal="true"], [data-barnaby-avoid="critical"], input:focus, textarea:focus, select:focus, [contenteditable="true"]:focus';
  try {
    const criticalNodes = targetDoc.querySelectorAll(criticalSelector);
    for (let i = 0; i < criticalNodes.length && obstacles.length < 40; i++) {
      const el = criticalNodes[i] as HTMLElement;
      if (el.closest('[data-barnaby-overlay="true"]')) continue;
      const rect = el.getBoundingClientRect();
      pushRect(rect, 22, 'critical');
    }
  } catch {
    // Ignore selector edge cases
  }

  // 2. High-priority obstacles: visible form inputs, textareas, primary controls, navigation headers, exam questions
  const highSelector =
    'input, textarea, select, [contenteditable="true"], [data-barnaby-avoid], .exam-question, header, nav';
  try {
    const highNodes = targetDoc.querySelectorAll(highSelector);
    for (let i = 0; i < highNodes.length && obstacles.length < 110; i++) {
      const el = highNodes[i] as HTMLElement;
      if (el.closest('[data-barnaby-overlay="true"]')) continue;
      const rect = el.getBoundingClientRect();
      // Skip huge nav wrappers if they wrap the whole page
      if (rect.width > vw * 0.85 && rect.height > vh * 0.5) continue;
      pushRect(rect, 10, 'high');
    }
  } catch {
    // Ignore
  }

  // 3. Interactive buttons & links (capped to keep sampling <1ms)
  try {
    const interactiveNodes = targetDoc.querySelectorAll('button, a[href], [role="button"]');
    const step = interactiveNodes.length > 90 ? Math.ceil(interactiveNodes.length / 90) : 1;
    for (let i = 0; i < interactiveNodes.length && obstacles.length < 190; i += step) {
      const el = interactiveNodes[i] as HTMLElement;
      if (el.closest('[data-barnaby-overlay="true"]')) continue;
      const rect = el.getBoundingClientRect();
      pushRect(rect, 6, 'normal');
    }
  } catch {
    // Ignore
  }

  return obstacles;
}

/**
 * Computes weighted obstruction penalty for placing Barnaby at `pos`.
 * Zero means completely unobstructed open airspace or clean margin perch.
 */
export function scorePositionObstruction(
  pos: BarnabyPoint,
  size: BarnabySize,
  obstacles: BarnabyRect[]
): number {
  const barnabyRect = getBarnabyRectAt(pos, size);
  let penalty = 0;
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    const area = computeOverlapArea(barnabyRect, obs);
    if (area <= 0) continue;
    const weight = obs.priority === 'critical' ? 6 : obs.priority === 'high' ? 2.5 : 1;
    penalty += area * weight;
  }
  return penalty;
}

/**
 * Checks whether Barnaby is currently overlapping a critical or significant UI obstacle.
 */
export function isPositionObstructed(
  pos: BarnabyPoint,
  size: BarnabySize,
  obstacles: BarnabyRect[],
  thresholdRatio = 0.14
): boolean {
  const barnabyArea = Math.max(1, size.width * size.height);
  const barnabyRect = getBarnabyRectAt(pos, size);

  let normalOverlap = 0;
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    const area = computeOverlapArea(barnabyRect, obs);
    if (area <= 0) continue;
    // Any meaningful overlap with a modal, dialog, or focused input counts as obstructed immediately
    if (obs.priority === 'critical' && area > barnabyArea * 0.04) {
      return true;
    }
    if (obs.priority === 'high' && area > barnabyArea * 0.12) {
      return true;
    }
    normalOverlap += area;
  }

  return normalOverlap > barnabyArea * thresholdRatio;
}

/**
 * Generates diverse natural resting perches and open flight waypoints across the viewport.
 */
export function generateCandidatePerches(
  viewportWidth: number,
  viewportHeight: number,
  options?: { includeMidAir?: boolean }
): Array<BarnabyPoint & { kind: 'edge' | 'corner' | 'air' }> {
  const b = getSafeViewportBounds(viewportWidth, viewportHeight);
  const spanX = Math.max(1, b.maxX - b.minX);
  const spanY = Math.max(1, b.maxY - b.minY);
  const isDesktop = viewportWidth >= 1024;

  // Keep left-side waypoints past the desktop sidebar (~230px) so Barnaby glides over open workspace margins
  const contentLeftX = isDesktop ? Math.min(b.maxX, Math.max(b.minX + 244, b.minX + spanX * 0.22)) : b.minX;

  const candidates: Array<BarnabyPoint & { kind: 'edge' | 'corner' | 'air' }> = [
    // Screen corners & classic perches
    { x: b.maxX, y: b.maxY, kind: 'corner' },
    { x: b.maxX, y: b.minY + 10, kind: 'corner' },
    { x: contentLeftX, y: b.maxY, kind: 'corner' },
    { x: contentLeftX, y: b.minY + 12, kind: 'corner' },

    // Right edge resting perches
    { x: b.maxX, y: b.minY + spanY * 0.28, kind: 'edge' },
    { x: b.maxX, y: b.minY + spanY * 0.54, kind: 'edge' },
    { x: b.maxX, y: b.minY + spanY * 0.78, kind: 'edge' },

    // Bottom edge perches (natural sitting ledges)
    { x: b.minX + spanX * 0.78, y: b.maxY, kind: 'edge' },
    { x: b.minX + spanX * 0.56, y: b.maxY, kind: 'edge' },
    { x: b.minX + spanX * 0.36, y: b.maxY, kind: 'edge' },

    // Upper margin perches (below header)
    { x: b.minX + spanX * 0.80, y: b.minY + 8, kind: 'edge' },
    { x: b.minX + spanX * 0.58, y: b.minY + 8, kind: 'edge' },
    { x: b.minX + spanX * 0.38, y: b.minY + 8, kind: 'edge' },

    // Left workspace gutter perches
    { x: contentLeftX, y: b.minY + spanY * 0.34, kind: 'edge' },
    { x: contentLeftX, y: b.minY + spanY * 0.68, kind: 'edge' }
  ];

  if (options?.includeMidAir !== false) {
    // Graceful mid-air hover / cross-screen waypoints
    candidates.push(
      { x: b.minX + spanX * 0.84, y: b.minY + spanY * 0.38, kind: 'air' },
      { x: b.minX + spanX * 0.72, y: b.minY + spanY * 0.22, kind: 'air' },
      { x: b.minX + spanX * 0.66, y: b.minY + spanY * 0.66, kind: 'air' },
      { x: b.minX + spanX * 0.48, y: b.minY + spanY * 0.26, kind: 'air' },
      { x: b.minX + spanX * 0.44, y: b.minY + spanY * 0.72, kind: 'air' }
    );
  }

  return candidates.map((pt) => ({
    ...clampBarnabyPosition(pt, viewportWidth, viewportHeight),
    kind: pt.kind
  }));
}

export function distanceBetween(a: BarnabyPoint, b: BarnabyPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Selects a smooth, non-obstructive flight destination at an organic distance.
 */
export function pickNextRoamTarget(params: {
  current: BarnabyPoint;
  viewportWidth: number;
  viewportHeight: number;
  obstacles: BarnabyRect[];
  preferEdge?: boolean;
  minDistance?: number;
  rng?: () => number;
}): { point: BarnabyPoint; kind: 'edge' | 'corner' | 'air' } {
  const {
    current,
    viewportWidth,
    viewportHeight,
    obstacles,
    preferEdge = false,
    minDistance = viewportWidth < 640 ? 90 : 140,
    rng = Math.random
  } = params;

  const bounds = getSafeViewportBounds(viewportWidth, viewportHeight);
  const candidates = generateCandidatePerches(viewportWidth, viewportHeight, {
    includeMidAir: !preferEdge
  });

  const scored = candidates
    .map((cand) => {
      const dist = distanceBetween(current, cand);
      const obstruction = scorePositionObstruction(cand, bounds.size, obstacles);
      const tooClosePenalty = dist < minDistance ? 80000 : 0;
      const edgeBonus = preferEdge && cand.kind !== 'air' ? -300 : 0;
      // Mild jitter so Barnaby varies his routes naturally instead of looping 2 fixed corners
      const varietyJitter = rng() * 650;
      return {
        cand,
        dist,
        obstruction,
        score: obstruction + tooClosePenalty + edgeBonus + varietyJitter
      };
    })
    .sort((a, b) => a.score - b.score);

  // Pick from top 3 cleanest destinations for natural variety
  const topPool = scored.slice(0, Math.min(3, scored.length));
  const chosen = topPool[Math.floor(rng() * topPool.length)] || scored[0];

  return {
    point: { x: chosen.cand.x, y: chosen.cand.y },
    kind: chosen.cand.kind
  };
}

/**
 * Picks a polite, unobtrusive attentive spot when Barnaby approaches with a helpful suggestion.
 */
export function pickApproachTarget(params: {
  current: BarnabyPoint;
  viewportWidth: number;
  viewportHeight: number;
  obstacles: BarnabyRect[];
}): BarnabyPoint {
  const { viewportWidth, viewportHeight, obstacles } = params;
  const bounds = getSafeViewportBounds(viewportWidth, viewportHeight);
  const spanX = Math.max(1, bounds.maxX - bounds.minX);
  const spanY = Math.max(1, bounds.maxY - bounds.minY);

  // Friendly attentive margins where speech bubble fits cleanly without blocking central text
  const preferredSpots: BarnabyPoint[] = [
    { x: bounds.maxX - 10, y: bounds.minY + spanY * 0.24 },
    { x: bounds.maxX - 10, y: bounds.maxY - 14 },
    { x: bounds.minX + spanX * 0.82, y: bounds.minY + 18 },
    { x: bounds.maxX - 12, y: bounds.minY + spanY * 0.52 },
    { x: bounds.minX + 16, y: bounds.maxY - 12 }
  ].map((pt) => clampBarnabyPosition(pt, viewportWidth, viewportHeight));

  let best = preferredSpots[0];
  let bestScore = Infinity;
  for (const pt of preferredSpots) {
    const score = scorePositionObstruction(pt, bounds.size, obstacles);
    if (score < bestScore) {
      bestScore = score;
      best = pt;
    }
  }
  return best;
}

/**
 * Picks Barnaby's resting perch — honoring user's chosen resting spot when unobstructed.
 */
export function pickRestPerch(params: {
  current: BarnabyPoint;
  viewportWidth: number;
  viewportHeight: number;
  obstacles: BarnabyRect[];
  userRestSpot?: BarnabyPoint | null;
}): BarnabyPoint {
  const { current, viewportWidth, viewportHeight, obstacles, userRestSpot } = params;
  const bounds = getSafeViewportBounds(viewportWidth, viewportHeight);

  if (userRestSpot) {
    const clamped = clampBarnabyPosition(userRestSpot, viewportWidth, viewportHeight);
    if (!isPositionObstructed(clamped, bounds.size, obstacles)) {
      return clamped;
    }
  }

  return pickNextRoamTarget({
    current,
    viewportWidth,
    viewportHeight,
    obstacles,
    preferEdge: true,
    minDistance: 0
  }).point;
}

/**
 * Finds the nearest clean non-obstructive spot when a modal, menu, or focused input overlaps Barnaby.
 */
export function findNonObstructiveSpot(params: {
  current: BarnabyPoint;
  viewportWidth: number;
  viewportHeight: number;
  obstacles: BarnabyRect[];
}): BarnabyPoint | null {
  const { current, viewportWidth, viewportHeight, obstacles } = params;
  const bounds = getSafeViewportBounds(viewportWidth, viewportHeight);
  const clampedCurrent = clampBarnabyPosition(current, viewportWidth, viewportHeight);

  if (!isPositionObstructed(clampedCurrent, bounds.size, obstacles)) {
    return null;
  }

  const candidates = generateCandidatePerches(viewportWidth, viewportHeight, { includeMidAir: true });
  let best: BarnabyPoint = { x: bounds.maxX, y: bounds.maxY };
  let bestScore = Infinity;

  for (const cand of candidates) {
    const obstruction = scorePositionObstruction(cand, bounds.size, obstacles);
    const distBias = distanceBetween(clampedCurrent, cand) * 1.5;
    const total = obstruction + distBias;
    if (total < bestScore) {
      bestScore = total;
      best = { x: cand.x, y: cand.y };
    }
  }

  return best;
}

/**
 * Computes a short horizontal walk/hop along a resting perch if the adjacent path is unobstructed.
 */
export function computeWalkStepTarget(params: {
  current: BarnabyPoint;
  viewportWidth: number;
  viewportHeight: number;
  obstacles: BarnabyRect[];
  preferredDirection?: BarnabyFacing;
}): { point: BarnabyPoint; facing: BarnabyFacing } | null {
  const { current, viewportWidth, viewportHeight, obstacles, preferredDirection } = params;
  const bounds = getSafeViewportBounds(viewportWidth, viewportHeight);
  const stepDist = viewportWidth < 640 ? 52 : 76;

  const directions: BarnabyFacing[] =
    preferredDirection === 'left'
      ? ['left', 'right']
      : preferredDirection === 'right'
      ? ['right', 'left']
      : current.x > (bounds.minX + bounds.maxX) / 2
      ? ['left', 'right']
      : ['right', 'left'];

  for (const dir of directions) {
    const dx = dir === 'left' ? -stepDist : stepDist;
    const candidate = clampBarnabyPosition(
      { x: current.x + dx, y: current.y },
      viewportWidth,
      viewportHeight
    );
    if (Math.abs(candidate.x - current.x) < 28) continue;
    if (!isPositionObstructed(candidate, bounds.size, obstacles)) {
      return { point: candidate, facing: dir };
    }
  }

  return null;
}

/**
 * Calculates organic flight duration proportional to distance (never frantic, never teleporting).
 */
export function computeFlightDurationMs(from: BarnabyPoint, to: BarnabyPoint): number {
  const dist = distanceBetween(from, to);
  if (dist < 10) return 450;
  return Math.round(Math.max(820, Math.min(2100, 720 + dist * 2.0)));
}

/**
 * Resolves Barnaby's horizontal facing direction based on travel delta.
 */
export function computeFacing(
  from: BarnabyPoint,
  to: BarnabyPoint,
  fallback: BarnabyFacing = 'right'
): BarnabyFacing {
  const dx = to.x - from.x;
  if (dx < -16) return 'left';
  if (dx > 16) return 'right';
  return fallback;
}
