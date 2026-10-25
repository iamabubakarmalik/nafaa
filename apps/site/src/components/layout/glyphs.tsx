/**
 * Shell icons as plain inline SVG (lucide-react 1.59 path data, ISC licence).
 * lucide's components are client components, so using them in islands and
 * in the header would add lucide's runtime to every page. These render
 * identically with no JS. Server- and client-safe.
 */
import type { ReactNode, SVGProps } from 'react';

type GlyphProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number };

function glyph(children: ReactNode) {
  return function Glyph({ size = 20, strokeWidth = 1.75, ...rest }: GlyphProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        focusable="false"
        {...rest}
      >
        {children}
      </svg>
    );
  };
}

export const MenuGlyph = glyph(<path d="M4 5h16M4 12h16M4 19h16" />);
export const CloseGlyph = glyph(<path d="M18 6 6 18M6 6l12 12" />);
export const ChevronDownGlyph = glyph(<path d="m6 9 6 6 6-6" />);
export const MoonGlyph = glyph(
  <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />,
);
export const SunGlyph = glyph(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2m-7.07-17.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </>,
);
export const MonitorGlyph = glyph(
  <>
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </>,
);
export const LanguagesGlyph = glyph(<path d="m5 8 6 6m-7 0 6-6 2-3M2 5h12M7 2h1m14 20-5-10-5 10m2-4h6" />);
