# Design system

Everything that decides how Nafaa looks lives in this folder. Feature code
consumes these tokens; it does not define colors, fonts or sizes of its own.

```
design-system/
  index.ts                 Public entry. Import from '@/design-system' only.
  tokens/
    color.ts               Builds a 50–950 scale from one hex (OKLCH), contrast helpers
    presets.ts             Accent colors offered in Settings → Appearance
    typography.ts          Latin and Urdu font options, text-size scale
    layout.ts              Density and corner-radius options
  industries/
    identities.ts          Color, icon and label for each of the 31 industries
  theme/
    appearance.ts          Appearance model and how the layers are merged
    store.ts               Zustand store holding the layers (personal layer persisted)
    apply.ts               The only code that writes theme state to <html>
    AppearanceProvider.tsx Applies the theme; bridges tenant settings and industry
  styles/
    tokens.css             CSS variable defaults, print and reduced-motion rules
```

## How a screen gets its look

The final appearance is merged from four layers, later layers winning:

1. **Built-in defaults** — `DEFAULT_APPEARANCE` in `theme/appearance.ts`.
2. **Platform defaults** — set by Nafaa staff from the admin panel.
3. **Business defaults** — set by the owner in Settings → Appearance.
4. **Personal preferences** — each user's own choices, stored per device.

The accent color falls back to the **industry identity** color when neither the
business nor the user picked one, so a new pharmacy account already looks like
a pharmacy.

`AppearanceProvider` turns the result into CSS variables on `<html>`
(`--brand-50` … `--brand-950`, `--brand-fg`, `--font-latin`, `--font-urdu`,
`--radius-base`, `--control-height`), toggles the `dark` class, sets the root
font size for the text-size preference, and caches everything for the boot
script in `index.html`, which paints the saved theme before React loads.

## Using tokens in components

Tailwind is wired to the variables (see `tailwind.config.js`):

| Need | Use |
| --- | --- |
| Primary / accent color | `bg-brand-600`, `text-brand-700`, `ring-brand-500/30` |
| Text on a brand background | `text-brand-fg` |
| UI font / Urdu font / numbers | `font-sans`, `font-urdu`, `font-mono` |
| Theme corner radius | `rounded-theme` |

`emerald-*` is mapped to the brand scale as well, because existing screens use
it as their primary color. New code should write `brand-*`.

Rules for new code:

- No hex colors and no `rgba(...)` literals for brand colors.
- Type sizes in rem (`text-sm`, `text-[0.8125rem]`), never `px`, so the
  text-size preference applies. Nothing on screen goes below `0.625rem`.
- Every surface needs a `dark:` counterpart until the semantic surface tokens
  land (see the roadmap below).
- Read theme state with `useAppearance()`; never toggle the `dark` class or
  write `<html>` attributes yourself.

## Known follow-ups

- **Semantic success color.** Some screens use `emerald` to mean "success"
  (paid, delivered). Because `emerald` now follows the brand, those should move
  to `success-*` so they stay green when a business picks another accent.
- **Surface tokens for dark mode.** Replace the global dark-mode override layer
  in `index.css` with `bg-surface` / `text-fg` style tokens.
- **Right-to-left layout.** `RTL_ENABLED` in `theme/apply.ts` stays `false`
  until screens are translated and use logical spacing (`ms-*`, `me-*`).
