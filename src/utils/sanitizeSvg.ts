/**
 * Strict SVG allowlist sanitizer for rendering server-generated vector charts safely.
 * Strips scripts, foreignObject, embedded frames/objects, event handlers (on*),
 * and unsafe URI schemes (javascript:, vbscript:, data:) while preserving clean
 * geometric SVG chart elements and styling attributes.
 */

const ALLOWED_SVG_TAGS = new Set([
  'svg',
  'g',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'defs',
  'lineargradient',
  'radialgradient',
  'stop',
  'clippath',
  'title',
  'desc'
]);

const ALLOWED_SVG_ATTRS = new Set([
  'xmlns',
  'viewbox',
  'width',
  'height',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'd',
  'points',
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'opacity',
  'transform',
  'text-anchor',
  'dominant-baseline',
  'alignment-baseline',
  'font-family',
  'font-size',
  'font-weight',
  'letter-spacing',
  'dx',
  'dy',
  'id',
  'class',
  'offset',
  'stop-color',
  'stop-opacity',
  'gradientunits',
  'clip-path',
  'role',
  'aria-label',
  'aria-hidden',
  'preserveaspectratio'
]);

const UNSAFE_VALUE_PATTERN = /(?:javascript\s*:|vbscript\s*:|data\s*:|expression\s*\(|url\s*\(\s*['"]?\s*(?:https?:|\/\/|data:|javascript:))/i;

function isSafeAttributeValue(attrName: string, rawValue: string): boolean {
  const val = rawValue.trim();
  if (!val) return true;
  if (UNSAFE_VALUE_PATTERN.test(val)) return false;
  if (attrName === 'clip-path' || attrName === 'fill' || attrName === 'stroke') {
    // Allow local fragment url(#id) references only
    if (/url\s*\(/i.test(val) && !/^url\(\s*#[a-zA-Z0-9_\-]+\s*\)$/i.test(val)) {
      return false;
    }
  }
  return true;
}

export function sanitizeSvgMarkup(rawSvg: string | null | undefined): string {
  if (!rawSvg || typeof rawSvg !== 'string') return '';
  const trimmed = rawSvg.trim();
  if (!trimmed || !trimmed.toLowerCase().includes('<svg')) return '';

  // Browser DOMParser path: strict structural AST sanitization
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(trimmed, 'image/svg+xml');
      const parserError = doc.querySelector('parsererror');
      const root = doc.documentElement;
      if (parserError || !root || root.tagName.toLowerCase() !== 'svg') {
        return '';
      }

      const cleanNode = (el: Element): void => {
        const children = Array.from(el.children);
        for (const child of children) {
          const tag = child.tagName.toLowerCase();
          if (!ALLOWED_SVG_TAGS.has(tag)) {
            child.remove();
            continue;
          }
          cleanNode(child);
        }

        const attrs = Array.from(el.attributes);
        for (const attr of attrs) {
          const lowerName = attr.name.toLowerCase();
          if (
            lowerName.startsWith('on') ||
            !ALLOWED_SVG_ATTRS.has(lowerName) ||
            !isSafeAttributeValue(lowerName, attr.value)
          ) {
            el.removeAttribute(attr.name);
          }
        }
      };

      cleanNode(root);
      return new XMLSerializer().serializeToString(root);
    } catch {
      return '';
    }
  }

  // Non-browser fallback (SSR / Node tests): strip dangerous tags, event handlers, and unsafe URIs
  return trimmed
    .replace(/<\s*(script|foreignObject|iframe|object|embed|style|link|meta|image|use)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|foreignObject|iframe|object|embed|style|link|meta|image|use)[^>]*\/?\s*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(?:xlink:)?href\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(?:javascript|vbscript|data)\s*:/gi, '');
}
