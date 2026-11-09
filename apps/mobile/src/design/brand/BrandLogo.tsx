/**
 * Logos of sales channels, couriers, payment wallets and ad platforms (the
 * same files as the web BrandLogo). Unknown ones get a lettermark.
 *
 *   <BrandLogo name={brandForPayment('JAZZCASH')} size={28} />
 */

import { Image, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Bike, Globe, Plug } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/Icon';
import { Text } from '../components/Text';
import { BRAND_SVG } from './logos/brandSvgs';

/* eslint-disable @typescript-eslint/no-require-imports */
const PNG: Record<string, number> = {
  callcourier: require('./logos/png/callcourier.png'),
  daewoo: require('./logos/png/daewoo.png'),
  indolj: require('./logos/png/indolj.png'),
  jazzcash: require('./logos/png/jazzcash.png'),
  leopards: require('./logos/png/leopards.png'),
  mnp: require('./logos/png/mnp.png'),
  postex: require('./logos/png/postex.png'),
  raast: require('./logos/png/raast.png'),
  sadapay: require('./logos/png/sadapay.png'),
  trax: require('./logos/png/trax.png'),
  barqraftar: require('./logos/png/barqraftar.png'),
  zoom: require('./logos/png/zoom.png'),
  instaworld: require('./logos/png/instaworld.png'),
  shipnoc: require('./logos/png/shipnoc.png'),
  pakpost: require('./logos/png/pakpost.png'),
  run: require('./logos/png/run.png'),
  xtreme: require('./logos/png/xtreme.png'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

export type BrandName =
  | 'shopify' | 'woocommerce' | 'wordpress' | 'daraz' | 'foodpanda' | 'indolj' | 'website'
  | 'tcs' | 'leopards' | 'postex' | 'trax' | 'mnp' | 'callcourier' | 'blueex' | 'daewoo' | 'tpl' | 'rider'
  | 'swyft' | 'tranzo' | 'barqraftar' | 'zoom' | 'instaworld' | 'shipnoc' | 'bykea' | 'movex' | 'forrun'
  | 'pakpost' | 'xtreme' | 'run'
  | 'jazzcash' | 'easypaisa' | 'safepay' | 'raast' | 'nayapay' | 'sadapay' | 'payfast'
  | 'google' | 'whatsapp' | 'meta' | 'tiktok' | 'other';

const BRANDS: Record<BrandName, { label: string; color: string; bg?: string; pad?: number; letters?: string }> = {
  shopify: { label: 'Shopify', color: '#7AB55C' },
  woocommerce: { label: 'WooCommerce', color: '#96588A', pad: 0.1 },
  wordpress: { label: 'WordPress', color: '#21759B' },
  daraz: { label: 'Daraz', color: '#F85606', pad: 0 },
  foodpanda: { label: 'foodpanda', color: '#D70F64' },
  indolj: { label: 'Indolj', color: '#B80000', pad: 0.1 },
  website: { label: 'Website', color: '#0EA5E9' },
  tcs: { label: 'TCS', color: '#D40511', pad: 0.08 },
  leopards: { label: 'Leopards', color: '#FFD000', pad: 0.08 },
  postex: { label: 'PostEx', color: '#92CF4E', bg: '#111827', pad: 0.1 },
  trax: { label: 'Trax', color: '#479B6C', pad: 0.06 },
  mnp: { label: 'M&P', color: '#F06020', pad: 0.1 },
  callcourier: { label: 'Call Courier', color: '#00B048', pad: 0.1 },
  blueex: { label: 'BlueEx', color: '#0047BA' },
  daewoo: { label: 'Daewoo FastEx', color: '#0B8BD9', pad: 0.12 },
  tpl: { label: 'Rider (TPL)', color: '#64748B', letters: 'TPL' },
  swyft: { label: 'Swyft', color: '#64748B', letters: 'SW' },
  tranzo: { label: 'Tranzo', color: '#3244DD', pad: 0.1 },
  barqraftar: { label: 'BarqRaftar', color: '#FDB913', pad: 0.06 },
  zoom: { label: 'Zoom COD', color: '#D9261C', pad: 0.06 },
  instaworld: { label: 'InstaWorld', color: '#97D9F7', pad: 0.08 },
  shipnoc: { label: 'ShipNOC', color: '#8DC63F', pad: 0.1 },
  bykea: { label: 'Bykea', color: '#64748B', letters: 'BY' },
  movex: { label: 'MoveX', color: '#64748B', letters: 'MX' },
  forrun: { label: 'Forrun', color: '#64748B', letters: 'FR' },
  pakpost: { label: 'Pakistan Post', color: '#D8232A', pad: 0 },
  xtreme: { label: 'Xtreme Ecom', color: '#1F4FBF', pad: 0.06 },
  run: { label: 'Run Courier', color: '#39FF14', bg: '#000000', pad: 0.1 },
  rider: { label: 'Rider', color: '#64748B' },
  jazzcash: { label: 'JazzCash', color: '#E82028', pad: 0.1 },
  easypaisa: { label: 'Easypaisa', color: '#27B15D', bg: '#0E3F20', pad: 0.06 },
  safepay: { label: 'Safepay', color: '#002DE0', pad: 0.08 },
  raast: { label: 'Raast', color: '#D32B25', pad: 0.1 },
  nayapay: { label: 'NayaPay', color: '#FF5018', pad: 0.18 },
  sadapay: { label: 'SadaPay', color: '#3FD6B0', pad: 0.14 },
  payfast: { label: 'PayFast', color: '#000628', pad: 0 },
  google: { label: 'Google', color: '#4285F4' },
  whatsapp: { label: 'WhatsApp', color: '#25D366' },
  meta: { label: 'Facebook / Instagram', color: '#0467DF', pad: 0.14 },
  tiktok: { label: 'TikTok', color: '#000000', pad: 0.18 },
  other: { label: 'Other', color: '#64748B' },
};

export const brandColor = (b: BrandName) => BRANDS[b].color;
export const brandLabel = (b: BrandName) => BRANDS[b].label;

/** Sales channel type (+ website platform, Indolj) → logo. */
export function brandForChannel(type?: string | null, opts: { platform?: string | null; indolj?: boolean } = {}): BrandName {
  if (opts.indolj) return 'indolj';
  switch (type) {
    case 'SHOPIFY': return 'shopify';
    case 'WOOCOMMERCE': return 'woocommerce';
    case 'DARAZ': return 'daraz';
    case 'FOODPANDA': return 'foodpanda';
    case 'CUSTOM_WEBSITE': case undefined: case null:
      if (opts.platform === 'shopify') return 'shopify';
      if (opts.platform === 'woocommerce') return 'woocommerce';
      if (opts.platform === 'wordpress') return 'wordpress';
      if (opts.platform === 'indolj') return 'indolj';
      return 'website';
    default: return 'other';
  }
}

const PAYMENT: Record<string, BrandName> = {
  SAFEPAY: 'safepay', JAZZCASH: 'jazzcash', EASYPAISA: 'easypaisa', RAAST: 'raast', NAYAPAY: 'nayapay', SADAPAY: 'sadapay', PAYFAST: 'payfast',
};
export const brandForPayment = (code?: string | null): BrandName => PAYMENT[String(code ?? '').toUpperCase()] ?? 'other';

export function BrandLogo({ name, size = 32 }: { name: BrandName; size?: number }) {
  const th = useTheme();
  const b = BRANDS[name] ?? BRANDS.other;
  const radius = Math.round(size * 0.28);
  const svg = BRAND_SVG[name];
  const png = PNG[name];
  if (svg || png) {
    const pad = Math.round(size * (b.pad ?? 0.16));
    const inner = size - pad * 2;
    return (
      <View accessibilityLabel={b.label} style={{
        width: size, height: size, borderRadius: radius, backgroundColor: b.bg ?? '#ffffff', padding: pad, overflow: 'hidden',
        borderWidth: th.isDark ? 0 : 0.5, borderColor: th.colors.border, alignItems: 'center', justifyContent: 'center',
      }}>
        {svg ? <SvgXml xml={svg} width={inner} height={inner} /> : <Image source={png} style={{ width: inner, height: inner }} resizeMode="contain" />}
      </View>
    );
  }
  const icon = name === 'website' ? Globe : name === 'rider' ? Bike : name === 'other' ? Plug : null;
  return (
    <View accessibilityLabel={b.label} style={{
      width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center',
      backgroundColor: icon ? `${b.color}22` : b.color,
    }}>
      {icon ? <Icon icon={icon} size={Math.round(size * 0.52)} color={b.color} />
        : <Text size="2xs" weight="heavy" color="#ffffff" ltr>{b.letters ?? b.label.slice(0, 2).toUpperCase()}</Text>}
    </View>
  );
}

export function ChannelLogo({ type, platform, size }: { type?: string | null; platform?: string | null; size?: number }) {
  return <BrandLogo name={brandForChannel(type, { platform })} size={size} />;
}
