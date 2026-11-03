# Design kit (`src/design`)

Everything that decides how the Nafaa app looks lives here. Screens use these
components and tokens; they do not define colors, fonts or sizes of their own.
It mirrors the web design system (`apps/web/src/design-system`): same accent
scale, presets, surfaces, industry identities and appearance layers, adapted
for touch.

Import everything from `@/design`.

```
design/
  index.ts             public entry
  tokens/              color scale (OKLCH, same as web), presets, typography (Inter + Noto Naskh Arabic),
                       layout (density, corners, control heights, breakpoints), surfaces, hero options, motion
  industries/          identities.ts (color, icon, label per industry), businessTypes.ts (tenant type → industry)
  theme/               appearance.ts (model + layers), store.ts, palette.ts (semantic colors),
                       ThemeProvider.tsx (useTheme), AppearanceBridge.tsx (/appearance sync), fonts.ts, makeStyles.ts
  brand/               Logo, Wordmark, NafaaAiMark, AppIntro (opening animation)
  components/          the kit (below)
  templates/           list, detail, form and settings screen templates (below)
```

## Rules

- No hex colors in screens. Use `useTheme().colors.*` (semantic) or a kit component.
- All text goes through `<Text>` (or a kit component). All words go through `t()`.
- Money is `<Amount>` (always `Rs 12,500`, Latin digits, left-to-right). Phones,
  codes, emails: `<Text ltr>`.
- Spacing with `theme.space(n)` (4pt grid × density), corners with
  `theme.radius('lg')`, control heights with `theme.control('md')`.
- Direction icons (arrows, chevrons, back) take `flip` so they mirror in Urdu.
  Use `start`/`end` (not `left`/`right`) for positions.
- Tap targets are 44pt or more. Use `PressableScale` for anything tappable.
- Motion runs on the UI thread (Reanimated) and checks `theme.motion` (OS
  reduce-motion + Appearance → Animations). Haptics through `haptic()`
  (`@/core/device/haptics`), which respects Appearance → Haptics.
- Inside Reanimated worklets (`useAnimatedStyle`) never touch `theme` itself;
  copy the values you need into local constants first.
- Screens are built from the templates. A new screen type needs a new template
  here first, not a one-off layout.

## Theme

```tsx
const th = useTheme();
th.colors.surface / text / textMuted / border / brand.solid / brand.soft / success.text …
th.space(4)            // 16 at comfortable density
th.radius('xl')        // follows Corners
th.control('lg')       // 52
th.type('base')        // { fontSize, lineHeight } at the user's text size
th.fontFamily('bold')  // current Latin font (Urdu: th.fontFamily('bold', 'urdu'))
th.isDark, th.rtl, th.motion, th.haptics
th.appearance.mobile   // { tabBar, header, startScreen, posGrid, animations, haptics }
```

`makeStyles` builds a memoized StyleSheet from the theme:

```tsx
const useStyles = makeStyles((t) => ({ box: { padding: t.space(4), backgroundColor: t.colors.surface } }));
```

### Appearance (same layers as the web)

Built-in defaults → platform (admin) → business (owner) → personal (each user).
A personal change is marked unsent on the device until the server has it, so
a reload (language change) or offline time never loses it to an older copy;
`primeFirstFrame()` paints the native background before React draws.
The accent falls back to the industry color. Layers are read from and saved to
`/appearance` by `AppearanceBridge`; the personal layer also lives on the device
so the first frame is right offline. Mobile-only fields are flat keys:
`mobileTabBar` (floating · labels · icons), `mobileHeader` (compact · standard ·
large), `mobileStartScreen` (home · pos), `mobilePosGrid` (list · small · medium ·
large), `mobileAnimations`,
`mobileHaptics` (`mobileHomeWidgets` is still accepted but unused: Home uses
the dashboard layout shared with the web, see modules/home). Read them from `th.appearance.mobile`. Change them with
`useAppearanceStore().setPersonal({ … })`.

## Screen templates

Every screen is one of four kinds. Copy these; do not invent new layouts.
Headers are slim by default and follow Appearance → Header size (compact: one
slim bar; standard/large: a large title that collapses into the bar on scroll).

### List screen — `ListTemplate`

```tsx
const [q, setQ] = useState('');
const query = useQuery({ queryKey: ['products', q], queryFn: () => productsApi.list({ q }) });

<ListTemplate
  title={t('Products')}
  tabBar                                       // shown inside the tabs
  actions={<IconButton icon={SlidersHorizontal} label={t('Filters')} onPress={openFilters} />}
  search={{ value: q, onChange: setQ, placeholder: t('Search products'), onScan: openScanner }}
  filters={{ value: filter, onChange: setFilter, options: [{ value: 'all', label: t('All') }, { value: 'low', label: t('Low stock') }] }}
  summary={<StatTile label={t('Stock value')} value={<Amount value={total} size="xl" weight="bold" />} />}
  data={query.data?.items}
  loading={query.isLoading}
  error={query.error}
  onRetry={query.refetch}
  refreshing={query.isRefetching}
  onRefresh={query.refetch}
  keyExtractor={(p) => p.id}
  renderItem={({ item }) => (
    <ListRow title={item.name} subtitle={t('{{count}} in stock', { count: item.stock })} trailing={<Amount value={item.price} />} chevron onPress={() => router.push(`/products/${item.id}`)} />
  )}
  empty={<EmptyState icon={Package} title={t('No products yet')} action={<Button icon={Plus}>{t('New')}</Button>} />}
  fab={{ icon: Plus, label: t('New'), onPress: () => router.push('/products/new') }}
/>
```

### Detail screen — `DetailTemplate`, `DetailSection`, `DetailRow`

```tsx
<DetailTemplate
  title={sale.number}
  subtitle={formatDateTime(sale.soldAt)}
  actions={<IconButton icon={Share2} label={t('Share')} onPress={share} />}
  summary={<PageHero title={sale.customer?.name ?? t('Walk-in customer')} stats={[{ label: t('Total'), value: <HeroAmount value={sale.total} size="2xl" /> }]} />}
  loading={q.isLoading} error={q.error} onRetry={q.refetch} onRefresh={q.refetch} refreshing={q.isRefetching}
  bottomActions={<>
    <Button variant="secondary" icon={Printer} style={{ flex: 1 }}>{t('Print')}</Button>
    <Button icon={RotateCcw} style={{ flex: 1 }}>{t('Return')}</Button>
  </>}
>
  <DetailSection title={t('Payment')}>
    <DetailRow label={t('Cash')} value={<Amount value={sale.cash} />} />
    <DetailRow label={t('Udhaar')} value={<Amount value={sale.credit} />} last />
  </DetailSection>
</DetailTemplate>
```

### Form screen — `FormTemplate`, `FormSection`

Inputs stay above the keyboard; Save is pinned at the bottom; leaving with
unsaved changes asks first.

```tsx
<FormTemplate title={isNew ? t('New product') : t('Edit product')} dirty={isDirty} saving={save.isPending} onSave={submit}
  secondaryAction={!isNew && <IconButton icon={Trash2} label={t('Delete')} variant="danger" size="lg" onPress={remove} />}>
  <FormSection title={t('Basic')}>
    <Input label={t('Naam')} value={name} onChangeText={setName} error={errors.name} />
    <MoneyInput label={t('Price')} value={price} onChangeValue={setPrice} />
    <Select label={t('Category')} value={categoryId} onChange={setCategoryId} options={categoryOptions} />
  </FormSection>
</FormTemplate>
```

### Settings screen — `SettingsTemplate`, `SettingsGroup`, `SettingSwitch`, `SettingLink`

```tsx
<SettingsTemplate title={t('Counter rules')} description={t('…')} loading={q.isLoading} error={q.error} onRetry={q.refetch}>
  <SettingsGroup title={t('Discount')} footnote={t('…')}>
    <SettingSwitch label={t('Haath se Discount')} value={s.manualDiscount} onChange={(v) => save({ manualDiscount: v })} />
    <SettingLink icon={Percent} label={t('Zyada se zyada Discount')} value="50%" onPress={openLimit} />
  </SettingsGroup>
</SettingsTemplate>
```

Tab screens with their own top (Home) use `Screen` directly with
`header={<AppHeader />}` and `tabBarSpace`.

## Components

| Component | Use | Example |
| --- | --- | --- |
| `Screen` | Frame: safe area, slim collapsing header, scroll, pull-to-refresh, sticky footer. `keyboard` for forms, `narrow` for form width on tablets, `tabBarSpace` in tabs | `<Screen title={t('Settings')}>…</Screen>` |
| `ScreenHeader`, `LargeTitle`, `useScreenScroll` | Header parts for custom screens | `<ScreenHeader title={t('Scan')} actions={…} />` |
| `PageHero`, `HeroButton`, `HeroIconButton`, `HeroAmount`, `HeroText`, `HeroBackdrop` | Accent summary box (web PageHero: Modern, Simple, Soft, Dark, Aurora, Outline; size from Header size). Keep it for Home and summaries only | `<PageHero title={t('Sales')} chip={t('Today')} stats={[{ label: t('Sale'), value: <HeroAmount value={x} size="2xl" /> }]} />` |
| `Text` | All text. `size` 2xs…4xl, `weight`, `tone`, `align`, `ltr`, `tabular`. Urdu runs use the Urdu font with taller lines | `<Text size="sm" tone="muted">{t('…')}</Text>` |
| `Amount` | Money, always LTR `Rs` format. `compact` (1.2 L), `signed`, `colorize`, `hidden` | `<Amount value={1250} weight="bold" />` |
| `Icon` | Lucide icon in theme colors; `flip` for direction icons | `<Icon icon={ChevronRight} flip tone="subtle" />` |
| `Button` | primary, secondary, soft, ghost, danger, critical, success, inverse, link; sizes sm md lg xl; `icon`, `iconEnd`, `loading`, `fullWidth`; arrows mirror in Urdu with `iconFlip` / `iconEndFlip` (never put → in the text) | `<Button variant="link" iconEnd={ArrowRight} iconEndFlip>{t('Sab dekhein')}</Button>` |
| `IconButton` | Icon-only action; `label` required; `badge` | `<IconButton icon={Bell} label={t('Notifications')} badge={3} />` |
| `PressableScale` | Base for custom tappables: spring press, haptic, a11y role | `<PressableScale onPress={…} haptic="tap">…</PressableScale>` |
| `Card`, `SectionHeader` | Grouped content with title/description/action/footer; `flush` for rows; `tone` for callouts | `<Card title={t('Low stock')} flush>…</Card>` |
| `ListRow`, `ListGroup` | Rows with icon/avatar/leading, title, subtitle, trailing, chevron, `destructive`, long-press; groups with dividers | `<ListRow icon={Package} title={p.name} trailing={<Amount value={p.price} />} chevron onPress={…} />` |
| `SwipeRow` | Swipe actions on a row (end actions by default; mirrors in Urdu). Tapping an action closes the row | `<SwipeRow end={[{ icon: Plus, label: t('Stock'), tone: 'brand', onPress }]}><ListRow … /></SwipeRow>` |
| `List`, `PullToRefresh` | FlashList with loading skeleton, error, empty and refresh built in | `<List data={…} renderItem={…} loading={…} onRefresh={…} />` |
| `SearchBar`, `useDebouncedValue` | Search field with clear and optional scan button | `<SearchBar value={q} onChangeText={setQ} onScan={scan} />` |
| `Chip`, `ChipGroup`, `Segmented`, `Tabs` | Filters (single or `multiple`, scroll or `wrap`), compact toggles, section tabs | `<Segmented value={mode} onChange={setMode} options={[…]} />` |
| `Badge`, `StatusPill` | Status labels by tone (brand, success, warning, danger, info, neutral, accent) | `<StatusPill tone="warning">{t('Pending')}</StatusPill>` |
| `StatTile` | Key number tile with icon, hint, press | `<StatTile label={t('Udhaar baqi')} icon={BookOpen} value={<Amount value={x} size="xl" weight="bold" />} />` |
| `ProgressBar` | Thin progress | `<ProgressBar value={0.6} />` |
| `Avatar` | Photo or colored initials | `<Avatar name={user.fullName} url={user.avatarUrl} size={40} />` |
| `Field`, `Input`, `TextArea`, `PasswordInput`, `MoneyInput` | Form fields with label, hint, error, icon, prefix, trailing; LTR for phone/email/number; MoneyInput gives `number \| null` with separators | `<MoneyInput label={t('Price')} value={p} onChangeValue={setP} />` |
| `Select` | Field that opens a searchable sheet; `multiple` | `<Select label={t('Role')} value={role} onChange={setRole} options={[…]} />` |
| `DatePicker` | Date or time field (sheet calendar on iOS, system dialog on Android) | `<DatePicker mode="time" label={t('Khulne ka waqt')} value={d} onChange={setD} />` |
| `OtpInput` | One-time code boxes with paste/autofill and shake on error | `<OtpInput value={code} onChange={setCode} onComplete={verify} />` |
| `Switch`, `Checkbox` | Boolean with label + description; RTL-aware knob | `<Switch value={on} onChange={setOn} label={t('…')} />` |
| `Sheet` | Bottom sheet (centered on tablets), drag to close, keyboard-safe, footer; `height` for fixed size | `<Sheet open={o} onClose={close} title={t('New')} footer={<Button fullWidth>{t('Save')}</Button>}>…</Sheet>` |
| `Dialog`, `confirm()`, `alert()` | Centered dialogs; `await confirm({ title, message, tone: 'danger' })` | `if (await confirm({ title: t('Delete product?'), tone: 'danger', confirmLabel: t('Delete') })) …` |
| `toast` | `toast.success / error / warning / info(title, { message, action })` | `toast.success(t('Product save ho gaya'))` |
| `EmptyState`, `ErrorState` | Empty lists; errors with offline-aware text and Retry | `<ErrorState error={q.error} onRetry={q.refetch} />` |
| `Skeleton`, `SkeletonRows` | Loading placeholders | `<SkeletonRows count={5} />` |
| `Fab` | Floating main action above the tab bar | `<Fab icon={Plus} label={t('New')} onPress={…} />` |
| `Stack`, `Row`, `Spacer`, `Divider` | Layout with density-aware gaps | `<Row gap={2} justify="between">…</Row>` |
| `useLayout` | `isTablet` (≥768), `isWide` (≥1024), `columns` | `const { isTablet } = useLayout();` |
| `Sparkline`, `LineChart`, `BarChart`, `DonutChart`, `HBarList`, `ProgressRing` (`components/charts/`) | react-native-svg charts, always left to right, theme colors (`useChartColors`). Line/area and bars take `labels` + `series`, tap to read a point; donut has a centre slot and legend; `HBarList` is ranked bars | `<LineChart labels={days} series={[{ key: 's', label: t('Sale'), data }]} format={formatMoney} />`, `<DonutChart slices={[{ key: 'cash', label: t('Cash'), value: 5000 }]} center={<Amount value={total} />} />` |
| `KpiStrip` | Sideways row of StatTiles for headers with many numbers | `<KpiStrip items={[{ key: 'due', label: t('Baqi'), value: <Amount value={x} /> }]} />` |
| `SortableList` | Drag rows into a new order (fixed row height; hold a row, move it); `onDragging` to pause a parent scroll | `<SortableList data={items} keyExtractor={(i) => i.id} rowHeight={72} renderItem={(i) => <Row item={i} />} onReorder={save} />` |
| `EmbeddedScreenContext` | Wrap a whole screen to show it inside another scroll view (Home's industry widget): `Screen` then draws only its content and `PageHero` turns quiet | `<EmbeddedScreenContext.Provider value><BakeryDashboardScreen /></EmbeddedScreenContext.Provider>` |
| `SavedDataNote` | "No internet · data from {{time}}" line for a query showing saved data; nothing when fresh | `<SavedDataNote query={q} />` |
| `BrandLogo`, `ChannelLogo` | Logos of channels, couriers, wallets and ad platforms (web BrandLogo); `brandForPayment`, `brandForChannel` | `<BrandLogo name={brandForPayment('JAZZCASH')} size={28} />` |
| `Logo`, `Wordmark`, `NafaaAiMark` | Brand marks (exact web logo) | `<Logo size={40} />` |
| `AppIntro` | Opening animation (root layout only). Starts without a layout event after 400 ms and always removes itself after 3 s | — |

Camera scanning is not in the kit: use `<Scanner />` from
`@/core/hardware/scanner` (`variant="fullscreen"` modal or `variant="inline"`
panel).

## Tablets

`useLayout().isTablet` switches the tabs to a side rail (shell), sheets to a
centered card, forms and detail screens to a centered 720pt column (`narrow`),
and Home lists to two columns. Lists can show list + detail side by side when
`isWide`.
