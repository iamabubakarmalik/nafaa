# Inventory (mobile)

Products, stock, catalog setup and product tools. Purchasing lives next door in
`src/modules/purchasing`. The web (`apps/web/src/modules/inventory`, `catalog`)
is the reference; screens use the same endpoints, permission keys and i18n keys.

```
api/            catalog (list + offline fallback), products (product, packs, variants,
                batches, images, insights, uploads), taxonomy (categories, brands, tags)
lib/shared.ts   query keys (INV, PUR), refreshInventory(), useOnline, useCostMask, qty, reason labels
components/     ProductPicker (mirror search + scan + variant), StockSheet (quick stock),
                Pickers (branch, category, brand, tags), PhotoField (camera/gallery upload),
                ProductThumb (photo or emoji), fields (NumberInput, Tiles, MarginCard)
industry/       config types, general + retail configs, registry
screens/        products list, product detail, product editor (+ core steps)
stock/          adjustments, stock count, damage, transfers, low stock, movements,
                stock report, expiry
catalog-setup/  categories/brands/tags, combos, multi-units, barcode labels, catalog
                showcase, bulk import, bulk edit, quick setup
```

Pure rules (packs, value/margin, landed cost, low stock, codes, adjustment
reasons, expiry, product emoji) are in `@nafaa/core/inventory` with tests.

## Offline

- Lists and search read the offline mirror (`useProductSearch`, `offline.products.byBarcode`);
  the products list falls back to the mirror with the server's shape when the server is unreachable.
- Writes: product create/edit (`enqueueProductCreate/Update`), rate (`enqueuePriceChange`),
  stock (`enqueueStockAdjustment`), counts (one adjustment per difference offline), damage
  (`enqueueDamage`), purchases (`enqueuePurchase`). Online, the editor waits for the server
  and then saves photos, packs, variants and batches.
- Online only: transfers, photo uploads, approvals, taxonomy/combos/units edits, labels design,
  import; screens show `onlineNeededText()` and the last saved data.

## Industry extension points

An industry never copies these screens. It registers one config:

```ts
// src/industries/bakery/inventory.ts
import { registerInventoryIndustry } from '@/modules/inventory/industry/registry';
import { basicStep, priceStep, stockStep } from '@/modules/inventory/screens/editor/coreSteps';
import { GENERAL_CORE } from '@/modules/inventory/industry/general';

const core = { ...GENERAL_CORE, skuPrefix: 'BKR', variants: false as const };
registerInventoryIndustry({
  id: 'bakery',                       // identity id (useIndustry().id)
  label: msg('Bakery'),
  list: {                             // products list (web ProductsPageConfig)
    noun: 'cheezein', filters: ['kind', 'tags'], facetLabels: { kind: { made: msg('Khud banaya') } },
    extras: (item) => ({ badges: item.bakery?.fridge ? [{ label: t('Fridge'), tone: 'info' }] : [] }),
    extraTab: { id: 'raw', label: msg('Raw material'), icon: Wheat, Component: RawMaterialsTab },
    actions: [{ icon: Factory, label: msg('Banayein'), href: '/manufacturing' }],
    Banners, onScanMiss, stockChips, stockLocked, sorts, guide,
  },
  editor: {                           // product editor (web EditorConfig)
    core,
    extra: { initial: { shelfLifeHours: null }, load, save, product },
    steps: [basicStep(core, { extra: (ctx) => <ShelfLife ctx={ctx} /> }), priceStep(core), stockStep(core), recipeStep],
  },
  detail: { badges, facts, tile, alerts, tabs, stockChips, extra: { key: 'bakery-profile', load } },
  routes: { detail, edit, create },   // only if the industry has its own product screens
});
```

Import the industry file once from the industry pack's entry so it registers at
start. Missing parts fall back to the general config. Other hooks:
`STOCK_REPORT_EXTRA` (stock/meta.ts) for extra stock-report statuses and
`registerCatalogConfig()` (catalog-setup) for the catalog showcase.
