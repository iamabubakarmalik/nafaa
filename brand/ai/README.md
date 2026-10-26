# Nafaa AI mark

The assistant's mark is a friendly robot head built from the Nafaa logo
(concept 02 Noon, see `../BRAND-GUIDELINES.md`):

- **Visor:** the Noon bowl, the exact logo geometry scaled down, in paper white on the green head. It always opens upwards.
- **Antenna:** the amber diamond on a short green stem. It is the "spark"; when the assistant is working it pulses gently.
- **Head:** brand green `#16a34a` tile with green-dark `#15803d` ears; eyes in paper `#f8fafc`.

| File | Use |
| --- | --- |
| `mark.svg` | Light backgrounds (diamond `#f59e0b`). |
| `mark-dark.svg` | Dark backgrounds (diamond `#fbbf24`, stem `#22c55e`). |
| `mark-mono.svg` | One colour (`currentColor`), eyes and visor cut out. For stamps, favicons in one ink, embossing. |

In the web app use `NafaaAiMark` from `apps/web/src/modules/ai-assistant/components/NafaaAiMark.tsx`
(`size` sm / md / lg or pixels, `state` idle / thinking). It follows light and dark mode and
stops the pulse when the user prefers reduced motion.

Rules: green and amber only; don't recolour, rotate or flip the bowl; keep at least 16 px;
leave clear space of a quarter of the mark's width around it.
