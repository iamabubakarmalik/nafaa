/**
 * ESLint for apps/site. Next's recommended rules plus the design-system rules
 * from ARCH 4.1:
 * - no inline `style` except CSS custom properties (for example
 *   style={{ '--accent': '5 150 105' }} or a packet's --path), so all real
 *   styling stays in Tailwind and the shared CSS;
 * - no raw hex colours in className; use tokens (brand-*, slate-*, fg, line).
 */
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const HEX = '/#[0-9a-fA-F]{3,8}\\b/';

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'src/lib/cms/contract/**'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    files: ['src/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='style'] > JSXExpressionContainer > :not(ObjectExpression)",
          message: 'Inline style must be an object literal of CSS custom properties only.',
        },
        {
          selector:
            "JSXAttribute[name.name='style'] > JSXExpressionContainer > ObjectExpression > :not(Property[key.value=/^--/])",
          message: 'Inline style may only set CSS custom properties (--name). Use Tailwind classes or tokens.',
        },
        {
          selector: `JSXAttribute[name.name='className'] Literal[value=${HEX}]`,
          message: 'No raw hex colours in className. Use design tokens.',
        },
        {
          selector: `JSXAttribute[name.name='className'] TemplateElement[value.raw=${HEX}]`,
          message: 'No raw hex colours in className. Use design tokens.',
        },
      ],
    },
  },
  {
    // next/og (Satori) renders from inline style objects; these files are
    // image renderers, not page components.
    files: [
      'src/lib/og/**',
      'src/app/**/opengraph-image.tsx',
      'src/app/**/twitter-image.tsx',
      'src/app/**/icon.tsx',
      'src/app/**/apple-icon.tsx',
    ],
    rules: { 'no-restricted-syntax': 'off' },
  },
];

export default config;
