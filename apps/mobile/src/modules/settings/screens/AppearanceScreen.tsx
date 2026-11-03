/**
 * Settings → Appearance (mirror of the web AppearancePage, plus the mobile
 * options). Everything the web offers works here and stays in sync through
 * /appearance: mode, accent (presets, industry color or any hex), fonts,
 * text size, density, corners, page background, contrast, page header look,
 * and the mobile-only tab bar, start screen, POS grid, Home blocks,
 * animations and haptics.
 *
 * "Mere liye" changes apply at once and follow the person to every device.
 * "Poori dukaan" (owners) edits the business defaults with a live preview and
 * a Save button.
 */

import {
  Check, LayoutGrid, Monitor, Moon, RotateCcw, Sun, Type,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { t } from '@/core/i18n';
import { haptic } from '@/core/device/haptics';
import {
  APPEARANCE_QUERY_KEY, BRAND_PRESETS, Button, CANVAS_TONES, Card, ChipGroup, DENSITIES, HERO_PATTERNS,
  HERO_STATS_LAYOUTS, HERO_STYLES, HeroBackdrop, Icon, IconButton, Input, isHexColor, LATIN_FONTS, PressableScale, RADII, Screen, Segmented,
  Switch, TEXT_SCALES, Text, ThemeOverride, URDU_FONTS, appearanceApi, buildTheme, industryIdentity, industryIdForBusinessType, readableOn,
  resolveAppearance, toast, useAppearanceStore, useTheme,
  type AppearanceLayer, type CanvasToneId, type Density, type HeaderSize, type HeroPattern, type HeroStatsLayout, type HeroStyle,
  type PosGridSize, type Radius, type StartScreen, type TabBarStyle, type TextScale, type ThemeMode,
} from '@/design';
import { useAuthStore } from '@/core/auth/store';
import { AppearancePreview } from '../components/AppearancePreview';

type Scope = 'personal' | 'business';


function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const th = useTheme();
  return (
    <Card>
      <View style={{ gap: th.space(3) }}>
        <View style={{ gap: 2 }}>
          <Text size="md" weight="bold">{title}</Text>
          {hint && <Text size="sm" tone="muted">{hint}</Text>}
        </View>
        {children}
      </View>
    </Card>
  );
}

/** Selectable cards in a wrapping grid. */
function OptionGrid<V extends string>({ value, onChange, options, columns = 2 }: {
  value: V; onChange: (v: V) => void; columns?: number;
  options: { value: V; label: string; description?: string; render?: React.ReactNode }[];
}) {
  const th = useTheme();
  const c = th.colors;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <PressableScale
            key={o.value}
            onPress={() => onChange(o.value)}
            haptic="select"
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            style={{
              width: `${100 / columns - 2.2}%`, padding: th.space(2.5), gap: th.space(1.5), borderRadius: th.radius('lg'),
              borderWidth: on ? 1.5 : 1, borderColor: on ? c.brand.solid : c.border, backgroundColor: on ? c.brand.soft : c.surface,
            }}
          >
            {o.render}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text size="sm" weight="semibold" style={{ flex: 1 }} numberOfLines={1}>{o.label}</Text>
              {on && <Icon icon={Check} size={15} color={c.brand.text} strokeWidth={3} />}
            </View>
            {o.description && <Text size="xs" tone="muted" numberOfLines={2}>{o.description}</Text>}
          </PressableScale>
        );
      })}
    </View>
  );
}

export function AppearanceScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const store = useAppearanceStore();
  const businessType = useAuthStore((s) => s.tenant?.businessType);
  const canEditBusiness = useAppearanceStore((s) => s.canEditBusiness);
  const [scope, setScope] = useState<Scope>('personal');
  const [draft, setDraft] = useState<AppearanceLayer>(store.business ?? {});
  const [saving, setSaving] = useState(false);
  const [customHex, setCustomHex] = useState('');
  const [customFont, setCustomFont] = useState('');

  useEffect(() => {
    if (scope === 'business') setDraft(store.business ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const industryColor = industryIdentity(industryIdForBusinessType(businessType)).color;

  // What each control shows: the effective value for the chosen scope.
  const effective = useMemo(
    () => (scope === 'personal'
      ? store.resolved
      : resolveAppearance({ platform: store.platform, business: draft, personal: {}, industryColor: store.industryColor })),
    [scope, store.resolved, store.platform, store.industryColor, draft],
  );
  const layer: AppearanceLayer = scope === 'personal' ? store.personal : draft;

  const set = (patch: AppearanceLayer) => {
    if (scope === 'personal') store.setPersonal(patch);
    else setDraft((d) => ({ ...d, ...patch }));
  };
  const clear = (key: keyof AppearanceLayer) => {
    if (scope === 'personal') store.resetPersonal([key]);
    else setDraft((d) => { const next = { ...d }; delete next[key]; return next; });
  };

  const previewTheme = useMemo(
    () => (scope === 'business' ? buildTheme(effective, effective.mode === 'dark' || (effective.mode === 'system' && th.isDark), th.fonts, !th.motion) : th),
    [scope, effective, th],
  );

  const saveBusiness = async () => {
    setSaving(true);
    try {
      const saved = await appearanceApi.saveBusiness(draft);
      store.setBusiness(saved);
      void qc.invalidateQueries({ queryKey: APPEARANCE_QUERY_KEY });
      haptic('success');
      toast.success(t('Dukaan ki appearance save ho gayi'));
    } catch {
      toast.error(t('Save nahi hua. Dobara koshish karein.'));
    } finally {
      setSaving(false);
    }
  };

  const accent = layer.brandColor ?? null;

  return (
    <Screen
      title={t('Appearance')}
      actions={<IconButton icon={RotateCcw} label={t('Default par wapas')} onPress={() => (scope === 'personal' ? store.resetPersonal() : setDraft({}))} />}
      footer={scope === 'business' ? <Button size="lg" fullWidth loading={saving} onPress={() => void saveBusiness()}>{t('Dukaan ke liye save karein')}</Button> : undefined}
    >
      {canEditBusiness && (
        <Segmented<Scope>
          value={scope}
          onChange={setScope}
          options={[{ value: 'personal', label: t('Mere liye') }, { value: 'business', label: t('Poori dukaan') }]}
        />
      )}
      <Text size="sm" tone="muted">
        {scope === 'personal' ? t('Ye sirf aap ke liye hai aur aap ke har device par chalega.') : t('Dukaan ke sab logon ke liye pehle se chuni hui appearance. Har banda apni pasand se badal sakta hai.')}
      </Text>

      <ThemeOverride theme={previewTheme}>
        <AppearancePreview />
      </ThemeOverride>

      <Section title={t('Theme')}>
        <Segmented<ThemeMode>
          value={effective.mode}
          onChange={(mode) => set({ mode })}
          options={[{ value: 'light', label: t('Light'), icon: Sun }, { value: 'dark', label: t('Dark'), icon: Moon }, { value: 'system', label: t('System'), icon: Monitor }]}
        />
      </Section>

      <Section title={t('Rang (accent)')} hint={t('Buttons, header aur nishaan is rang me. Rang na chunein to aap ke kaam ka rang lagta hai.')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2.5) }}>
          <PressableScale onPress={() => clear('brandColor')} haptic="select" accessibilityLabel={t('Kaam ka rang')} style={{ alignItems: 'center', gap: 4, width: 58 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: industryColor, alignItems: 'center', justifyContent: 'center', borderWidth: accent === null ? 3 : 0, borderColor: th.colors.text }}>
              {accent === null && <Icon icon={Check} size={18} color={readableOn(industryColor)} strokeWidth={3} />}
            </View>
            <Text size="2xs" tone="muted" numberOfLines={1}>{t('Kaam ka')}</Text>
          </PressableScale>
          {BRAND_PRESETS.map((p) => {
            const on = accent?.toLowerCase() === p.hex;
            return (
              <PressableScale key={p.id} onPress={() => set({ brandColor: p.hex })} haptic="select" accessibilityLabel={t(p.label)} style={{ alignItems: 'center', gap: 4, width: 58 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: p.hex, alignItems: 'center', justifyContent: 'center', borderWidth: on ? 3 : 0, borderColor: th.colors.text }}>
                  {on && <Icon icon={Check} size={18} color={readableOn(p.hex)} strokeWidth={3} />}
                </View>
                <Text size="2xs" tone="muted" numberOfLines={1}>{t(p.label)}</Text>
              </PressableScale>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: th.space(2), alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Input label={t('Apna rang (hex)')} placeholder="#16a34a" value={customHex} onChangeText={setCustomHex} autoCapitalize="none" ltr size="md"
              trailing={isHexColor(customHex) ? <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: customHex.startsWith('#') ? customHex : `#${customHex}` }} /> : undefined} />
          </View>
          <Button variant="secondary" disabled={!isHexColor(customHex)} onPress={() => set({ brandColor: (customHex.startsWith('#') ? customHex : `#${customHex}`).toLowerCase() })}>{t('Lagayein')}</Button>
        </View>
      </Section>

      <Section title={t('Text ka size')}>
        <OptionGrid<TextScale>
          columns={4}
          value={effective.textScale}
          onChange={(textScale) => set({ textScale })}
          options={(Object.keys(TEXT_SCALES) as TextScale[]).map((k) => ({
            value: k, label: t(TEXT_SCALES[k].label),
            render: <Text weight="bold" style={{ fontSize: 15 * TEXT_SCALES[k].factor, lineHeight: 22 * TEXT_SCALES[k].factor }}>Aa</Text>,
          }))}
        />
      </Section>

      <Section title={t('Font')} hint={t('English aur number ka font, aur Urdu ka font alag alag.')}>
        <OptionGrid<string>
          value={effective.latinFont}
          onChange={(latinFont) => set({ latinFont })}
          options={LATIN_FONTS.map((f) => ({ value: f.id, label: t(f.label), render: <Icon icon={Type} size={16} tone="muted" /> }))}
        />
        <View style={{ flexDirection: 'row', gap: th.space(2), alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}><Input label={t('Koi bhi Google font')} placeholder="Lato" value={customFont} onChangeText={setCustomFont} size="md" ltr /></View>
          <Button variant="secondary" disabled={customFont.trim().length < 2} onPress={() => set({ latinFont: `gf:${customFont.trim()}` })}>{t('Lagayein')}</Button>
        </View>
        <Text size="sm" weight="semibold" tone="secondary">{t('Urdu font')}</Text>
        <OptionGrid<string>
          value={effective.urduFont}
          onChange={(urduFont) => set({ urduFont })}
          options={URDU_FONTS.map((f) => ({ value: f.id, label: t(f.label), render: <Text style={{ fontFamily: th.fonts.urdu.regular, fontSize: 16, lineHeight: 28 }}>{f.sample}</Text> }))}
        />
      </Section>

      <Section title={t('Layout')}>
        <Text size="sm" weight="semibold" tone="secondary">{t('Jagah (density)')}</Text>
        <Segmented<Density> value={effective.density} onChange={(density) => set({ density })} options={(Object.keys(DENSITIES) as Density[]).map((k) => ({ value: k, label: t(DENSITIES[k].label) }))} />
        <Text size="sm" weight="semibold" tone="secondary">{t('Kone (corners)')}</Text>
        <Segmented<Radius> value={effective.radius} onChange={(radius) => set({ radius })} options={(Object.keys(RADII) as Radius[]).map((k) => ({ value: k, label: t(RADII[k].label) }))} />
        <Text size="sm" weight="semibold" tone="secondary">{t('Background')}</Text>
        <OptionGrid<CanvasToneId>
          columns={3}
          value={effective.canvasTone}
          onChange={(canvasTone) => set({ canvasTone })}
          options={(Object.keys(CANVAS_TONES) as CanvasToneId[]).map((k) => ({
            value: k, label: t(CANVAS_TONES[k].label),
            render: <View style={{ height: 26, borderRadius: th.radius('sm'), borderWidth: 1, borderColor: th.colors.border, backgroundColor: k === 'tinted' ? th.colors.brandScale[50] : th.isDark ? CANVAS_TONES[k].dark.canvas : CANVAS_TONES[k].light.canvas }} />,
          }))}
        />
        <Switch value={effective.contrast === 'high'} onChange={(on) => set({ contrast: on ? 'high' : 'normal' })} label={t('Zyada contrast')} description={t('Halka text aur lakeerein gehri — tez roshni aur kamzor nazar ke liye.')} />
      </Section>

      <Section title={t('Header')} hint={t('Har screen ka upar wala hissa aur Home ka rangeen dabba.')}>
        <Text size="sm" weight="semibold" tone="secondary">{t('Header ka size')}</Text>
        <OptionGrid<HeaderSize>
          columns={3}
          value={effective.mobileHeader}
          onChange={(mobileHeader) => set({ mobileHeader })}
          options={[
            { value: 'compact', label: t('Chhota'), description: t('Patla header, zyada jagah kaam ko') },
            { value: 'standard', label: t('Darmiyana'), description: t('Bara title, scroll par chhota') },
            { value: 'large', label: t('Bara'), description: t('Bare number aur title') },
          ]}
        />
        <Text size="sm" weight="semibold" tone="secondary">{t('Rangeen dabbe ka andaaz')}</Text>
        <OptionGrid<HeroStyle>
          columns={3}
          value={effective.heroStyle}
          onChange={(heroStyle) => set({ heroStyle })}
          options={(Object.keys(HERO_STYLES) as HeroStyle[]).map((k) => ({
            value: k, label: t(HERO_STYLES[k].label),
            render: (
              <View style={{ height: 40, borderRadius: th.radius('md'), overflow: 'hidden', borderWidth: k === 'outline' || k === 'soft' ? 1 : 0, borderColor: th.colors.brand.border }}>
                <HeroBackdrop style={k} pattern={effective.heroPattern} radius={th.radius('md')} />
              </View>
            ),
          }))}
        />
        <Text size="sm" weight="semibold" tone="secondary">{t('Pattern')}</Text>
        <ChipGroup<HeroPattern> wrap value={effective.heroPattern} onChange={(heroPattern) => set({ heroPattern })} options={(Object.keys(HERO_PATTERNS) as HeroPattern[]).map((k) => ({ value: k, label: t(HERO_PATTERNS[k].label) }))} />
        <Text size="sm" weight="semibold" tone="secondary">{t('Numbers')}</Text>
        <Segmented<HeroStatsLayout> value={effective.heroStats} onChange={(heroStats) => set({ heroStats })} options={(Object.keys(HERO_STATS_LAYOUTS) as HeroStatsLayout[]).map((k) => ({ value: k, label: t(HERO_STATS_LAYOUTS[k].label) }))} />
      </Section>

      <Section title={t('Mobile app')} hint={t('Sirf phone aur tablet ke liye.')}>
        <Text size="sm" weight="semibold" tone="secondary">{t('Neeche ki tab bar')}</Text>
        <OptionGrid<TabBarStyle>
          columns={3}
          value={effective.mobileTabBar}
          onChange={(mobileTabBar) => set({ mobileTabBar })}
          options={[
            { value: 'floating', label: t('Floating'), description: t('Tairti hui, gol kone') },
            { value: 'labels', label: t('Labels'), description: t('Poori chaurai, naam ke saath') },
            { value: 'icons', label: t('Icons'), description: t('Sirf nishaan') },
          ]}
        />
        <Text size="sm" weight="semibold" tone="secondary">{t('App khulte hi')}</Text>
        <Segmented<StartScreen> value={effective.mobileStartScreen} onChange={(mobileStartScreen) => set({ mobileStartScreen })} options={[{ value: 'home', label: t('Home') }, { value: 'pos', label: t('POS counter') }]} />
        <Text size="sm" weight="semibold" tone="secondary">{t('POS me products ka size')}</Text>
        <Segmented<PosGridSize>
          value={effective.mobilePosGrid}
          onChange={(mobilePosGrid) => set({ mobilePosGrid })}
          options={[{ value: 'list', label: t('List') }, { value: 'small', label: t('Chhote') }, { value: 'medium', label: t('Darmiyane') }, { value: 'large', label: t('Bare') }]}
        />
        <Text size="sm" weight="semibold" tone="secondary">{t('Home par kya dikhe')}</Text>
        <Button variant="secondary" icon={LayoutGrid} onPress={() => router.push({ pathname: '/', params: { customize: '1' } })}>{t('Home customize karein')}</Button>
        <Text size="xs" tone="muted">{t('Hisse, numbers aur rozana target web dashboard ke saath ek hi hain — ek jagah badlein, dono jagah lagega.')}</Text>
        <Switch value={effective.mobileAnimations} onChange={(mobileAnimations) => set({ mobileAnimations })} label={t('Animations')} description={t('Band karein to screens bina harkat ke badlengi.')} />
        <Switch value={effective.mobileHaptics} onChange={(mobileHaptics) => set({ mobileHaptics })} label={t('Haptics (halki thar-thar)')} description={t('Button dabane par halka sa jhatka.')} />
      </Section>
    </Screen>
  );
}
