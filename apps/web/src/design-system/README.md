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
  tailwind/
    palette.cjs            Tailwind palettes with automatic dark-mode values
    dark-rules.json        Dark-mode rules shared by Tailwind and the runtime brand scale
  styles/
    tokens.css             CSS variable defaults (light and dark), print rules
    base.css               Element defaults layered after Tailwind preflight
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

## Dark mode

Dark mode is automatic. Every Tailwind color step that needs a different
value in dark mode reads a CSS variable that `html.dark` overrides, and the
rule depends on the utility (see `tailwind/palette.cjs`):

| Utility | Light value | In dark mode |
| --- | --- | --- |
| `bg-white`, `bg-slate-50…300` | light surfaces | dark surfaces |
| `bg-slate-700…950` | dark "inverse" surfaces | raised dark surfaces |
| `bg-blue-50…300` (any hue) | soft tints | low-opacity glows |
| `text-slate-400…950` | grey text | light text |
| `text-blue-600…950` (any hue) | deep hue text | light end of the same hue |
| `border-slate-50…400`, hue `-50…300` | light lines | dark lines |
| solid hues (`bg-blue-600`), `text-white`, black | unchanged | unchanged |

So a screen written only with light-mode classes is already correct in dark
mode. Add a `dark:` class only to deliberately change the automatic result,
and then use the fixed `ink-*` palette (`dark:bg-ink-800`, `dark:text-ink-white`)
— `ink` never switches, so the override means exactly what it says.

## Rules for new code

- No hex colors and no `rgba(...)` literals for brand colors.
- Type sizes in rem (`text-sm`, `text-[0.8125rem]`), never `px`, so the
  text-size preference applies. Nothing on screen goes below `0.625rem`.
- Do not add `dark:` classes for greys or tints; the engine handles them.
- Read theme state with `useAppearance()`; never toggle the `dark` class or
  write `<html>` attributes yourself.

## Known follow-ups

- **Semantic success color.** Some screens use `emerald` to mean "success"
  (paid, delivered). Because `emerald` now follows the brand, those should move
  to `success-*` so they stay green when a business picks another accent.
- **Right-to-left layout.** `RTL_ENABLED` in `theme/apply.ts` stays `false`
  until screens are translated and use logical spacing (`ms-*`, `me-*`).
