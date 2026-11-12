/** Google font family name → the CSS variable of its self-hosted copy (app/fonts.ts). */
const MAP: Record<string, string> = {
  inter: '--ff-inter',
  'playfair display': '--ff-playfair',
  jost: '--ff-jost',
  sora: '--ff-sora',
  'plus jakarta sans': '--ff-jakarta',
  fraunces: '--ff-fraunces',
  'dm sans': '--ff-dmsans',
  poppins: '--ff-poppins',
  montserrat: '--ff-montserrat',
  lora: '--ff-lora',
  'cormorant garamond': '--ff-cormorant',
  manrope: '--ff-manrope',
  outfit: '--ff-outfit',
  nunito: '--ff-nunito',
  lato: '--ff-lato',
  'open sans': '--ff-opensans',
  roboto: '--ff-roboto',
  'work sans': '--ff-worksans',
  'libre baskerville': '--ff-baskerville',
  marcellus: '--ff-marcellus',
  'bebas neue': '--ff-bebas',
  oswald: '--ff-oswald',
  raleway: '--ff-raleway',
  'noto naskh arabic': '--ff-naskh',
  'noto nastaliq urdu': '--font-urdu',
};

export function fontVar(family: string | null | undefined): string | null {
  return family ? MAP[family.trim().toLowerCase()] ?? null : null;
}
