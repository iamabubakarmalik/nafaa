/**
 * Self-hosted fonts a shop can pick (next/font, no layout shift). Each is a
 * CSS variable; the theme points --font-heading / --font-body at two of them
 * (lib/theme/tokens.ts). Nothing is preloaded and browsers fetch only faces a
 * page uses, so offering many families costs a shop nothing. Families not
 * listed here load from Google Fonts by name.
 */
import {
  Cormorant_Garamond,
  DM_Sans,
  Fraunces,
  Inter,
  Jost,
  Lora,
  Manrope,
  Montserrat,
  Noto_Nastaliq_Urdu,
  Outfit,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Poppins,
  Sora,
  Nunito,
  Lato,
  Open_Sans,
  Roboto,
  Work_Sans,
  Libre_Baskerville,
  Marcellus,
  Bebas_Neue,
  Oswald,
  Raleway,
  Noto_Naskh_Arabic,
} from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap', preload: false, variable: '--ff-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], display: 'swap', preload: false, variable: '--ff-playfair' });
const jost = Jost({ subsets: ['latin'], display: 'swap', preload: false, variable: '--ff-jost' });
const sora = Sora({ subsets: ['latin'], display: 'swap', preload: false, variable: '--ff-sora' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap', preload: false, variable: '--ff-jakarta' });
const fraunces = Fraunces({ subsets: ['latin'], display: 'swap', preload: false, variable: '--ff-fraunces' });
const dmsans = DM_Sans({ subsets: ['latin'], display: 'swap', preload: false, variable: '--ff-dmsans' });
const poppins = Poppins({ subsets: ['latin'], display: 'swap', preload: false, weight: ['400', '500', '600', '700'], variable: '--ff-poppins' });
const montserrat = Montserrat({ subsets: ['latin'], display: 'swap', preload: false, variable: '--ff-montserrat' });
const lora = Lora({ subsets: ['latin'], display: 'swap', preload: false, variable: '--ff-lora' });
const cormorant = Cormorant_Garamond({ subsets: ['latin'], display: 'swap', preload: false, weight: ['400', '500', '600', '700'], variable: '--ff-cormorant' });
const manrope = Manrope({ subsets: ['latin'], display: 'swap', preload: false, variable: '--ff-manrope' });
const outfit = Outfit({ subsets: ['latin'], display: 'swap', preload: false, variable: '--ff-outfit' });
const nunito = Nunito({ subsets: ['latin'], display: 'swap', preload: false, variable: '--ff-nunito' });
const lato = Lato({ subsets: ['latin'], weight: ['400', '700'], display: 'swap', preload: false, variable: '--ff-lato' });
const opensans = Open_Sans({ subsets: ['latin'], display: 'swap', preload: false, variable: '--ff-opensans' });
const roboto = Roboto({ subsets: ['latin'], display: 'swap', preload: false, variable: '--ff-roboto' });
const worksans = Work_Sans({ subsets: ['latin'], display: 'swap', preload: false, variable: '--ff-worksans' });
const baskerville = Libre_Baskerville({ subsets: ['latin'], weight: ['400', '700'], display: 'swap', preload: false, variable: '--ff-baskerville' });
const marcellus = Marcellus({ subsets: ['latin'], weight: '400', display: 'swap', preload: false, variable: '--ff-marcellus' });
const bebas = Bebas_Neue({ subsets: ['latin'], weight: '400', display: 'swap', preload: false, variable: '--ff-bebas' });
const oswald = Oswald({ subsets: ['latin'], display: 'swap', preload: false, variable: '--ff-oswald' });
const raleway = Raleway({ subsets: ['latin'], display: 'swap', preload: false, variable: '--ff-raleway' });
const naskh = Noto_Naskh_Arabic({ subsets: ['arabic'], display: 'swap', preload: false, variable: '--ff-naskh' });
const urdu = Noto_Nastaliq_Urdu({ subsets: ['arabic'], weight: ['400', '600', '700'], display: 'swap', preload: false, variable: '--font-urdu' });

export const fontVariables = [inter, playfair, jost, sora, jakarta, fraunces, dmsans, poppins, montserrat, lora, cormorant, manrope, outfit, nunito, lato, opensans, roboto, worksans, baskerville, marcellus, bebas, oswald, raleway, naskh, urdu]
  .map((f) => f.variable)
  .join(' ');
