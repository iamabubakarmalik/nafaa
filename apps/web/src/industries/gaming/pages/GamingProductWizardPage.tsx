/**
 * Gaming item editor on the shared product editor: what it is (console,
 * game, accessory, PC part), platform and condition, game facts (publisher,
 * genre, region, age rating), hardware facts (storage, controllers, what is
 * in the box), rental rates and deposit, and pre-order / featured marks.
 * Editions (PS4/PS5) and colours are variants.
 */

import { CalendarClock, Disc3, Gamepad2, PackageOpen, Sparkles, Star } from 'lucide-react';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Chip, NumberField, Section, TextField, Tiles, Toggle } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, Errors, StepContext, StepDef } from '@modules/inventory/products/editor/types';
import { Input } from '@/design-system/components';
import { gamingProductsApi, type GamingConditionType, type GamingConsolePlatform, type GamingProductProfile } from '../api/products.api';
import { CATEGORY_GROUPS, CONDITIONS, GAMING_KEYS, PLATFORMS, categoryGroup, categoryLabel } from '../lib/meta';

interface GamingExtra {
  categoryType: string;
  platform: GamingConsolePlatform; conditionType: GamingConditionType;
  publisher: string; genre: string[]; ageRating: string; region: string; playerCount: string; onlineMultiplayer: boolean;
  storageCapacity: string; numberOfControllers: number | null; includedAccessories: string[]; gpuModel: string; cpuModel: string; ramSpec: string;
  isRentable: boolean; rentalPricePerDay: number | null; rentalPricePerHour: number | null; rentalDeposit: number | null;
  mrp: number | null; tradeInValue: number | null;
  isFeatured: boolean; isNewRelease: boolean; isPreOrder: boolean; preOrderReleaseDate: string; notes: string;
}

const initial: GamingExtra = {
  categoryType: '', platform: 'MULTI', conditionType: 'NEW_SEALED',
  publisher: '', genre: [], ageRating: '', region: '', playerCount: '', onlineMultiplayer: false,
  storageCapacity: '', numberOfControllers: null, includedAccessories: [], gpuModel: '', cpuModel: '', ramSpec: '',
  isRentable: false, rentalPricePerDay: null, rentalPricePerHour: null, rentalDeposit: null,
  mrp: null, tradeInValue: null, isFeatured: false, isNewRelease: false, isPreOrder: false, preOrderReleaseDate: '', notes: '',
};

const GENRES = ['Action', 'Sports', 'Racing', 'Shooter', 'Adventure', 'RPG', 'Fighting', 'Kids', 'Horror', 'Open world'];
const REGIONS = ['Asia', 'US', 'EU', 'UK', 'Japan', 'Region free'];
const AGES = ['3+', '7+', '12+', '16+', '18+'];
const IN_BOX = ['Controller', 'HDMI cable', 'Power cable', 'Charging cable', 'Headset', 'Game', 'Stand'];
const PUBLISHERS = ['EA', 'Sony', 'Ubisoft', 'Rockstar', 'Activision', 'Konami', 'Capcom', 'Microsoft', 'Nintendo'];
const opt = (v: string) => v.trim() || undefined;
const num = (v: number | null) => (v != null && Number.isFinite(v) ? v : undefined);
const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function Kind({ ctx }: { ctx: StepContext<GamingExtra> }) {
  const x = ctx.draft.extra;
  return (
    <div className="space-y-2">
      <span className="block text-[0.8125rem] font-medium text-slate-700">Ye kya hai</span>
      {CATEGORY_GROUPS.map((g) => (
        <div key={g.id}>
          <p className="mb-1 text-[0.75rem] font-semibold text-slate-500">{g.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {g.items.map(([v, l]) => <Chip key={v} on={x.categoryType === v} onClick={() => ctx.setExtra({ categoryType: x.categoryType === v ? '' : v })}>{l}</Chip>)}
          </div>
        </div>
      ))}
      <p className="text-[0.75rem] text-slate-500">Isi se counter ke filter (Games, Consoles, Accessories) chalte hain. Top-up card yahan nahi — Top-ups page par daalein.</p>
    </div>
  );
}

function Details({ ctx }: { ctx: StepContext<GamingExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const group = categoryGroup(x.categoryType || null);
  return (
    <div className="space-y-4">
      <Section icon={Gamepad2} title="Platform aur halat" hint="Counter aur bill par naam ke neeche dikhta hai">
        <Tiles value={x.platform} onChange={(platform) => set({ platform })} columns="grid-cols-3 sm:grid-cols-6"
          options={(['PS5', 'PS4', 'XBOX_SERIES_X', 'XBOX_ONE', 'NINTENDO_SWITCH', 'PC', 'MOBILE', 'MULTI'] as GamingConsolePlatform[]).map((p) => ({ value: p, label: PLATFORMS[p] }))} />
        <div className="mt-3">
          <Tiles value={x.conditionType} onChange={(conditionType) => set({ conditionType })} columns="grid-cols-2 sm:grid-cols-5"
            options={(Object.keys(CONDITIONS) as GamingConditionType[]).map((c) => ({ value: c, label: CONDITIONS[c].label }))} />
        </div>
      </Section>
      {(group === 'game' || !group) && (
        <Section icon={Disc3} title="Game ki details" hint="Marzi hai — search aur counter par kaam aati hain">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Company (publisher)" value={x.publisher} onChange={(publisher) => set({ publisher })} placeholder="EA, Sony, Rockstar" />
            <TextField label="Kitne player" value={x.playerCount} onChange={(playerCount) => set({ playerCount })} placeholder="1-4" />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">{PUBLISHERS.map((v) => <Chip key={v} on={x.publisher === v} onClick={() => set({ publisher: x.publisher === v ? '' : v })}>{v}</Chip>)}</div>
          <p className="mb-1 mt-3 text-[0.75rem] font-semibold text-slate-500">Genre</p>
          <div className="flex flex-wrap gap-1.5">{GENRES.map((v) => <Chip key={v} on={x.genre.includes(v)} onClick={() => set({ genre: toggle(x.genre, v) })}>{v}</Chip>)}</div>
          <p className="mb-1 mt-3 text-[0.75rem] font-semibold text-slate-500">Region · umar</p>
          <div className="flex flex-wrap gap-1.5">
            {REGIONS.map((v) => <Chip key={v} on={x.region === v} onClick={() => set({ region: x.region === v ? '' : v })}>{v}</Chip>)}
            {AGES.map((v) => <Chip key={v} on={x.ageRating === v} onClick={() => set({ ageRating: x.ageRating === v ? '' : v })}>{v}</Chip>)}
          </div>
          <div className="mt-3"><Toggle on={x.onlineMultiplayer} onChange={(onlineMultiplayer) => set({ onlineMultiplayer })} title="Online multiplayer" hint="Internet par doston ke saath" /></div>
        </Section>
      )}
      {(group === 'console' || group === 'pc' || group === 'gear') && (
        <Section icon={Sparkles} title="Hardware" hint="Storage, controller aur dabbe me kya hai">
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField label="Storage" value={x.storageCapacity} onChange={(storageCapacity) => set({ storageCapacity })} placeholder="825GB, 1TB" />
            <NumberField label="Controller" allowEmpty value={x.numberOfControllers} onChange={(v) => set({ numberOfControllers: v == null ? null : Math.max(0, Math.round(v)) })} />
            {group === 'pc' && <TextField label="GPU / CPU / RAM" value={x.gpuModel} onChange={(gpuModel) => set({ gpuModel })} placeholder="RTX 4060 · i5 · 16GB" />}
          </div>
          <p className="mb-1 mt-3 text-[0.75rem] font-semibold text-slate-500">Dabbe me</p>
          <div className="flex flex-wrap gap-1.5">{IN_BOX.map((v) => <Chip key={v} on={x.includedAccessories.includes(v)} onClick={() => set({ includedAccessories: toggle(x.includedAccessories, v) })}>{v}</Chip>)}</div>
        </Section>
      )}
    </div>
  );
}

function Rental({ ctx }: { ctx: StepContext<GamingExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  return (
    <div className="space-y-4">
      <Toggle on={x.isRentable} onChange={(isRentable) => set({ isRentable })} icon={PackageOpen} title="Kiraye par deta hun" hint="Rentals page par ye cheez aur is ka rate khud aata hai" />
      {x.isRentable && (
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label="Rozana kiraya" prefix="Rs" allowEmpty value={x.rentalPricePerDay} onChange={(rentalPricePerDay) => set({ rentalPricePerDay })} error={ctx.errors.rent} />
          <NumberField label="Ghante ka kiraya" prefix="Rs" allowEmpty value={x.rentalPricePerHour} onChange={(rentalPricePerHour) => set({ rentalPricePerHour })} hint="Marzi hai" />
          <NumberField label="Security deposit" prefix="Rs" allowEmpty value={x.rentalDeposit} onChange={(rentalDeposit) => set({ rentalDeposit })} hint="Wapsi par lauta dete hain" />
        </div>
      )}
      <Section icon={Star} title="Nishan" hint="Counter aur list par">
        <div className="grid gap-2 sm:grid-cols-3">
          <Toggle on={x.isFeatured} onChange={(isFeatured) => set({ isFeatured })} title="Khaas" hint="Aage dikhayein" />
          <Toggle on={x.isNewRelease} onChange={(isNewRelease) => set({ isNewRelease })} title="Naya aaya" />
          <Toggle on={x.isPreOrder} onChange={(isPreOrder) => set({ isPreOrder })} icon={CalendarClock} title="Pre-order" hint="Abhi aaya nahi" />
        </div>
        {x.isPreOrder && (
          <div className="mt-3 max-w-xs">
            <Input label="Kab aayega" type="date" value={x.preOrderReleaseDate} onChange={(e) => set({ preOrderReleaseDate: e.target.value })} hint="Customer ko bata sakein" />
          </div>
        )}
      </Section>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label="MRP (company rate)" prefix="Rs" allowEmpty value={x.mrp} onChange={(mrp) => set({ mrp })} hint="Marzi hai — counter par sale ka hisaab" />
        <NumberField label="Wapas lene ka rate (trade-in)" prefix="Rs" allowEmpty value={x.tradeInValue} onChange={(tradeInValue) => set({ tradeInValue })} hint="Customer purana de to kitne me lenge" />
      </div>
    </div>
  );
}

const core: CoreOptions = {
  units: [{ value: 'pcs', label: 'Adad (pcs)' }, { value: 'set', label: 'Set' }, { value: 'box', label: 'Dabba' }],
  skuPrefix: 'GM',
  packs: false,
  variants: { presets: [{ group: 'Edition', values: ['PS5', 'PS4', 'Standard', 'Deluxe'] }, { group: 'Rang', values: ['Black', 'White', 'Blue', 'Red'] }, { group: 'Storage', values: ['825GB', '1TB', '2TB'] }] },
  batches: false,
  markups: [5, 10, 15, 20],
};

const detailStep: StepDef<GamingExtra> = { id: 'gaming', title: 'Gaming', hint: 'Platform, halat, details', icon: Gamepad2, render: (ctx) => <Details ctx={ctx} /> };
const rentalStep: StepDef<GamingExtra> = {
  id: 'rental', title: 'Rental', hint: 'Kiraya, pre-order', icon: PackageOpen, render: (ctx) => <Rental ctx={ctx} />,
  validate: (d): Errors => (d.extra.isRentable && !(Number(d.extra.rentalPricePerDay) > 0) && !(Number(d.extra.rentalPricePerHour) > 0) ? { rent: 'Kiraye ka rate likhein' } : {}),
};

const config: EditorConfig<GamingExtra> = {
  label: 'Gaming',
  draftKey: 'nafaa.product-editor.gaming',
  paths: { list: '/products', detail: (id) => `/gaming-products/${id}`, create: '/gaming-products/new' },
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await gamingProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      return {
        categoryType: p.categoryType ?? '', platform: p.platform, conditionType: p.conditionType,
        publisher: p.publisher ?? '', genre: p.genre ?? [], ageRating: p.ageRating ?? '', region: p.region ?? '', playerCount: p.playerCount ?? '', onlineMultiplayer: p.onlineMultiplayer,
        storageCapacity: p.storageCapacity ?? '', numberOfControllers: p.numberOfControllers ?? null, includedAccessories: p.includedAccessories ?? [],
        gpuModel: p.gpuModel ?? '', cpuModel: p.cpuModel ?? '', ramSpec: p.ramSpec ?? '',
        isRentable: p.isRentable, rentalPricePerDay: p.rentalPricePerDay ?? null, rentalPricePerHour: p.rentalPricePerHour ?? null, rentalDeposit: p.rentalDeposit ?? null,
        mrp: p.mrp ?? null, tradeInValue: p.tradeInValue ?? null,
        isFeatured: p.isFeatured, isNewRelease: p.isNewRelease, isPreOrder: p.isPreOrder, preOrderReleaseDate: p.preOrderReleaseDate?.slice(0, 10) ?? '', notes: p.notes ?? '',
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      await gamingProductsApi.upsert({
        productId, categoryType: (x.categoryType || undefined) as GamingProductProfile['categoryType'], platform: x.platform, conditionType: x.conditionType,
        publisher: opt(x.publisher), genre: x.genre, ageRating: opt(x.ageRating), region: opt(x.region), playerCount: opt(x.playerCount), onlineMultiplayer: x.onlineMultiplayer,
        storageCapacity: opt(x.storageCapacity), numberOfControllers: num(x.numberOfControllers), includedAccessories: x.includedAccessories,
        gpuModel: opt(x.gpuModel), isRentable: x.isRentable, rentalPricePerDay: num(x.rentalPricePerDay), rentalPricePerHour: num(x.rentalPricePerHour), rentalDeposit: num(x.rentalDeposit),
        mrp: num(x.mrp), tradeInValue: num(x.tradeInValue), isFeatured: x.isFeatured, isNewRelease: x.isNewRelease, isPreOrder: x.isPreOrder,
        preOrderReleaseDate: x.isPreOrder ? opt(x.preOrderReleaseDate) : undefined, notes: opt(x.notes),
      });
    },
  },
  steps: [
    basicStep<GamingExtra>(core, {
      extra: (ctx) => <Kind ctx={ctx} />, namePlaceholder: 'Jaise: FIFA 25 (PS5) ya DualSense controller',
      categorySuggestions: ['Games', 'Consoles', 'Controllers', 'Headsets', 'PC parts', 'Snacks', 'Drinks'],
    }),
    priceStep<GamingExtra>(core),
    detailStep,
    rentalStep,
    stockStep<GamingExtra>(core, { quick: [1, 2, 5, 10] }),
  ],
  summary: (d) => {
    const x = d.extra;
    return (
      <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[0.8125rem]">
        <p className="text-slate-700">{[x.categoryType ? categoryLabel(x.categoryType) : null, PLATFORMS[x.platform], CONDITIONS[x.conditionType]?.label].filter(Boolean).join(' · ')}</p>
        {x.genre.length > 0 && <p className="text-slate-600">{x.genre.join(', ')}</p>}
        {x.isRentable && <p className="text-sky-700">Kiraye par{x.rentalPricePerDay ? ` · Rs ${x.rentalPricePerDay}/din` : ''}</p>}
      </div>
    );
  },
  refresh: [GAMING_KEYS.profiles, 'gaming-product-detail'],
  guide: [
    { icon: Gamepad2, color: '#7c3aed', title: 'Platform aur halat', text: 'PS5/PS4 aur naya/used zaroor chunein — counter par card par dikhta hai.' },
    { icon: PackageOpen, color: '#0891b2', title: 'Kiraya', text: 'Console kiraye par dete hain to Rental step me rozana rate aur deposit likhein.' },
  ],
};

export default function GamingProductWizardPage() {
  return <ProductEditorPage config={config} />;
}
