/**
 * Static HTML from a tree of plain server components.
 *
 * Big decorative SVG (the code-drawn diagrams) has no state and no event
 * handlers, yet as React elements every node goes into the RSC payload as
 * JSON and is hydrated in the browser. Written as one HTML string and set
 * with dangerouslySetInnerHTML, it appears in the HTML exactly as before,
 * travels in the payload as one compact string, and React skips it while
 * hydrating.
 *
 * Handles what such trees use: host elements, function components without
 * state, fragments, arrays, text and numbers, and next/link, which becomes a
 * plain <a> (the link stays in the HTML; following it loads the page
 * normally). Attribute names follow React (className → class, the
 * hyphenated SVG presentation attributes, xlink and xml names); style
 * objects follow React's px rules. Anything else (other client components,
 * context, lazy or memo types) throws StaticHtmlError, and the caller
 * renders the elements normally instead.
 *
 * `staticElement` applies this to a part of a page: it keeps the outer
 * element as a React element and writes everything inside it as HTML, so
 * the DOM and the CSS see exactly the same structure.
 */
import Link from 'next/link';
import { createElement, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react';

export class StaticHtmlError extends Error {}

const ELEMENT = new Set([Symbol.for('react.transitional.element'), Symbol.for('react.element')]);

/** Camel-case React props that the DOM spells with hyphens (React's own list, SVG part). */
const HYPHENATED = new Set([
  'accentHeight', 'alignmentBaseline', 'arabicForm', 'baselineShift', 'capHeight', 'clipPath', 'clipRule',
  'colorInterpolation', 'colorInterpolationFilters', 'colorProfile', 'colorRendering', 'dominantBaseline',
  'enableBackground', 'fillOpacity', 'fillRule', 'floodColor', 'floodOpacity', 'fontFamily', 'fontSize',
  'fontSizeAdjust', 'fontStretch', 'fontStyle', 'fontVariant', 'fontWeight', 'glyphName',
  'glyphOrientationHorizontal', 'glyphOrientationVertical', 'horizAdvX', 'horizOriginX', 'imageRendering',
  'letterSpacing', 'lightingColor', 'markerEnd', 'markerMid', 'markerStart', 'overlinePosition',
  'overlineThickness', 'paintOrder', 'pointerEvents', 'renderingIntent', 'shapeRendering', 'stopColor',
  'stopOpacity', 'strikethroughPosition', 'strikethroughThickness', 'strokeDasharray', 'strokeDashoffset',
  'strokeLinecap', 'strokeLinejoin', 'strokeMiterlimit', 'strokeOpacity', 'strokeWidth', 'textAnchor',
  'textDecoration', 'textRendering', 'transformOrigin', 'underlinePosition', 'underlineThickness',
  'unicodeBidi', 'unicodeRange', 'unitsPerEm', 'vAlphabetic', 'vHanging', 'vIdeographic', 'vMathematical',
  'vectorEffect', 'vertAdvY', 'vertOriginX', 'vertOriginY', 'wordSpacing', 'writingMode', 'xHeight',
]);

const RENAMED: Record<string, string> = {
  className: 'class',
  htmlFor: 'for',
  xlinkActuate: 'xlink:actuate',
  xlinkArcrole: 'xlink:arcrole',
  xlinkHref: 'xlink:href',
  xlinkRole: 'xlink:role',
  xlinkShow: 'xlink:show',
  xlinkTitle: 'xlink:title',
  xlinkType: 'xlink:type',
  xmlBase: 'xml:base',
  xmlLang: 'xml:lang',
  xmlSpace: 'xml:space',
  tabIndex: 'tabindex',
};

/** Style properties React writes without a unit. */
const UNITLESS = new Set([
  'animationIterationCount', 'aspectRatio', 'borderImageOutset', 'borderImageSlice', 'borderImageWidth',
  'columnCount', 'columns', 'flex', 'flexGrow', 'flexShrink', 'fontWeight', 'gridArea', 'gridColumn',
  'gridColumnEnd', 'gridColumnStart', 'gridRow', 'gridRowEnd', 'gridRowStart', 'lineClamp', 'lineHeight',
  'opacity', 'order', 'orphans', 'scale', 'tabSize', 'widows', 'zIndex', 'zoom', 'fillOpacity',
  'floodOpacity', 'stopOpacity', 'strokeDasharray', 'strokeDashoffset', 'strokeMiterlimit', 'strokeOpacity',
  'strokeWidth',
]);

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

const SKIP = new Set(['children', 'key', 'ref', 'dangerouslySetInnerHTML', 'suppressHydrationWarning', 'suppressContentEditableWarning']);

/** next/link props that are not attributes of the <a> it renders. */
const LINK_ONLY = new Set(['prefetch', 'replace', 'scroll', 'shallow', 'passHref', 'locale', 'legacyBehavior', 'onNavigate', 'unstable_dynamicOnHover']);

function escapeText(value: string): string {
  return value.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
}

function escapeAttr(value: string): string {
  return value.replace(/[&"]/g, (c) => (c === '&' ? '&amp;' : '&quot;'));
}

const kebab = (name: string): string => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function styleText(style: Record<string, unknown>): string {
  return Object.entries(style)
    .filter(([, v]) => v !== null && v !== undefined && v !== '' && typeof v !== 'boolean')
    .map(([k, v]) => {
      const name = k.startsWith('--') ? k : kebab(k).replace(/^ms-/, '-ms-');
      const value = typeof v === 'number' && v !== 0 && !k.startsWith('--') && !UNITLESS.has(k) ? `${v}px` : String(v);
      return `${name}:${value}`;
    })
    .join(';');
}

function attributes(props: Record<string, unknown>): string {
  let out = '';
  for (const [key, value] of Object.entries(props)) {
    if (SKIP.has(key) || value === undefined || value === null || typeof value === 'function') continue;
    const name = RENAMED[key] ?? (HYPHENATED.has(key) ? kebab(key) : key);
    const aria = name.startsWith('aria-') || name.startsWith('data-');
    if (key === 'style') {
      const css = styleText(value as Record<string, unknown>);
      if (css) out += ` style="${escapeAttr(css)}"`;
    } else if (typeof value === 'boolean') {
      if (aria) out += ` ${name}="${value}"`;
      else if (value) out += ` ${name}=""`;
    } else {
      out += ` ${name}="${escapeAttr(String(value))}"`;
    }
  }
  return out;
}

/** The HTML for `node`; throws StaticHtmlError for anything it cannot write. */
export function staticHtml(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string') return escapeText(node);
  if (typeof node === 'number' || typeof node === 'bigint') return String(node);
  if (Array.isArray(node)) return node.map(staticHtml).join('');
  if (typeof node === 'object' && ELEMENT.has((node as { $$typeof?: symbol }).$$typeof as symbol)) {
    const { type, props } = node as unknown as { type: unknown; props: Record<string, unknown> };
    if (type === Fragment) return staticHtml(props.children as ReactNode);
    if (type === Link) {
      if (typeof props.href !== 'string' || props.legacyBehavior) throw new StaticHtmlError('Only string hrefs');
      const attrs = Object.fromEntries(Object.entries(props).filter(([k]) => !LINK_ONLY.has(k)));
      return `<a${attributes(attrs)}>${staticHtml(props.children as ReactNode)}</a>`;
    }
    if (typeof type === 'function') {
      // Plain function components only: the client reference proxies are functions too.
      if ('$$typeof' in type) throw new StaticHtmlError('Client components cannot be written statically');
      return staticHtml((type as (p: Record<string, unknown>) => ReactNode)(props));
    }
    if (typeof type === 'string') {
      const inner = (props.dangerouslySetInnerHTML as { __html?: string } | undefined)?.__html ?? staticHtml(props.children as ReactNode);
      return VOID.has(type) ? `<${type}${attributes(props)}>` : `<${type}${attributes(props)}>${inner}</${type}>`;
    }
  }
  throw new StaticHtmlError('Unsupported node');
}

/**
 * `element` with its content written as static HTML: the outer element stays
 * a React element (same tag and props), its children become one HTML string.
 * Function components are resolved down to their first host element. When
 * the content cannot be written statically, `element` is returned as is.
 */
export function staticElement(element: ReactElement): ReactElement {
  try {
    let node: ReactNode = element;
    for (let depth = 0; depth < 8 && isValidElement(node) && typeof node.type === 'function'; depth++) {
      if ('$$typeof' in node.type) return element;
      node = (node.type as (p: unknown) => ReactNode)(node.props);
    }
    if (!isValidElement(node) || typeof node.type !== 'string') return element;
    const { children, ...props } = node.props as Record<string, unknown>;
    if (props.dangerouslySetInnerHTML) return element;
    return createElement(node.type, { ...props, key: element.key, dangerouslySetInnerHTML: { __html: staticHtml(children as ReactNode) } });
  } catch {
    return element;
  }
}
