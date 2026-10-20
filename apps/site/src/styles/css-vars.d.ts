/**
 * Lets `style` carry CSS custom properties without casts, for example
 * style={{ '--accent': '5 150 105' }} or a packet's style={{ '--path': "path('M0 0 L10 0')" }}.
 * ESLint allows only custom properties in `style` (eslint.config.mjs).
 */
import 'react';

declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
