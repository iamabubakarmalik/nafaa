/**
 * Help center: searchable questions, short guides that open the right screen
 * and support by WhatsApp, phone or email with the shop and user filled in.
 */

import { router } from 'expo-router';
import { ArrowRight, ChevronDown, Globe, Mail, MessageCircle, Phone, ScrollText, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Linking, View } from 'react-native';
import { t } from '@/core/i18n';
import { useAuthStore } from '@/core/auth/store';
import { Button, Card, Chip, EmptyState, Icon, ListGroup, ListRow, PressableScale, Screen, SearchBar, Segmented, Text, useDebouncedValue, useTheme } from '@/design';
import { FAQS, GUIDES, TOPICS, type HelpTopic } from '../lib/content';
import { mobileRouteFor } from '../lib/routeFor';
import { SUPPORT, supportWhatsapp } from '../lib/support';

type Tab = 'faq' | 'guides' | 'contact';

const open = (url: string) => { void Linking.openURL(url).catch(() => undefined); };

export function HelpScreen() {
  const th = useTheme();
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const [tab, setTab] = useState<Tab>('faq');
  const [search, setSearch] = useState('');
  const [topic, setTopic] = useState<'all' | HelpTopic>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const q = useDebouncedValue(search, 150).trim().toLowerCase();

  const wa = supportWhatsapp(t('Assalam-o-Alaikum, mujhe Nafaa me madad chahiye.\nDukaan: {{shop}}\nNaam: {{name}}\nEmail: {{email}}\n\nMasla: ', { shop: tenant?.name ?? '', name: user?.fullName ?? '', email: user?.email ?? '' }));

  const { faqs, guides } = useMemo(() => {
    const hit = (...parts: string[]) => !q || parts.some((p) => p.toLowerCase().includes(q));
    const inTopic = (x: HelpTopic) => topic === 'all' || x === topic;
    return {
      faqs: FAQS.filter((f) => inTopic(f.topic) && hit(f.q, f.a)),
      guides: GUIDES.filter((g) => inTopic(g.topic) && hit(g.title, g.text, ...g.steps)),
    };
  }, [topic, q]);

  const clear = () => { setSearch(''); setTopic('all'); };
  const noMatch = (
    <EmptyState icon={Search} title={t('Is ka jawab yahan nahi mila')} message={t('Doosre lafz se search, ya seedha support se poochein')}
      action={<Button icon={MessageCircle} onPress={() => open(wa)}>{t('WhatsApp')}</Button>} />
  );
  const tint = (id: HelpTopic) => TOPICS.find((x) => x.id === id)!;
  const badge = (id: HelpTopic, icon: typeof Search, size = 36) => (
    <View style={{ width: size, height: size, borderRadius: th.radius('md'), backgroundColor: `${tint(id).color}1f`, alignItems: 'center', justifyContent: 'center' }}>
      <Icon icon={icon} size={size / 2} color={tint(id).color} />
    </View>
  );

  return (
    <Screen title={t('Help')} narrow>
      <View style={{ gap: th.space(3) }}>
        <View style={{ flexDirection: 'row', gap: th.space(2) }}>
          <Button icon={MessageCircle} style={{ flex: 1 }} onPress={() => open(wa)}>{t('WhatsApp')}</Button>
          <Button icon={Phone} variant="secondary" style={{ flex: 1 }} onPress={() => open(`tel:${SUPPORT.phoneIntl}`)}>{t('Call')}</Button>
        </View>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('Kya poochna hai? Jaise: udhaar, return, backup…')} />
        <Segmented value={tab} onChange={setTab} options={[
          { value: 'faq', label: t('Questions'), count: faqs.length },
          { value: 'guides', label: t('Guides'), count: guides.length },
          { value: 'contact', label: t('Contact') },
        ]} />
        {tab !== 'contact' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
            <Chip label={t('Sab mauzoo')} selected={topic === 'all'} onPress={() => setTopic('all')} />
            {TOPICS.map((x) => <Chip key={x.id} label={x.label} icon={x.icon} selected={topic === x.id} onPress={() => setTopic(topic === x.id ? 'all' : x.id)} />)}
          </View>
        )}
      </View>

      {tab === 'faq' && (faqs.length === 0 ? noMatch : (
        <ListGroup>
          {faqs.map((f) => {
            const isOpen = openId === f.id || (!!q && faqs.length <= 3);
            return (
              <View key={f.id}>
                <ListRow
                  leading={badge(f.topic, tint(f.topic).icon)}
                  title={f.q}
                  trailing={<View style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}><Icon icon={ChevronDown} size={18} tone="subtle" /></View>}
                  onPress={() => setOpenId(isOpen ? null : f.id)}
                />
                {isOpen && (
                  <View style={{ paddingHorizontal: th.space(4), paddingBottom: th.space(4) }}>
                    <Text size="sm" tone="secondary">{f.a}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ListGroup>
      ))}

      {tab === 'guides' && (guides.length === 0 ? noMatch : (
        <View style={{ gap: th.space(3) }}>
          {guides.map((g) => {
            const route = mobileRouteFor(g.to);
            return (
              <Card key={g.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
                  {badge(g.topic, g.icon, 40)}
                  <View style={{ flex: 1 }}>
                    <Text weight="semibold">{g.title}</Text>
                    <Text size="sm" tone="muted">{g.text}</Text>
                  </View>
                </View>
                <View style={{ gap: th.space(2), marginTop: th.space(3) }}>
                  {g.steps.map((s, i) => (
                    <View key={s} style={{ flexDirection: 'row', gap: th.space(2), alignItems: 'flex-start' }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: th.colors.brand.soft, alignItems: 'center', justifyContent: 'center' }}>
                        <Text size="xs" weight="bold" tone="brand" ltr>{String(i + 1)}</Text>
                      </View>
                      <Text size="sm" style={{ flex: 1 }}>{s}</Text>
                    </View>
                  ))}
                </View>
                {route && (
                  <Button variant="soft" size="sm" iconEnd={ArrowRight} iconEndFlip style={{ marginTop: th.space(3), alignSelf: 'flex-start' }} onPress={() => router.push(route as never)}>{t('Open')}</Button>
                )}
              </Card>
            );
          })}
        </View>
      ))}

      {tab === 'contact' && (
        <View style={{ gap: th.space(4) }}>
          <ListGroup>
            <ListRow icon={MessageCircle} title={t('WhatsApp')} subtitle={t('Sab se jaldi jawab')} trailing={<Text ltr size="sm" tone="muted">{SUPPORT.phone}</Text>} onPress={() => open(wa)} />
            <ListRow icon={Phone} title={t('Call')} trailing={<Text ltr size="sm" tone="muted">{SUPPORT.phone}</Text>} onPress={() => open(`tel:${SUPPORT.phoneIntl}`)} />
            <ListRow icon={Mail} title={t('Email')} subtitle={t('Lambi baat ya screenshot')} trailing={<Text ltr size="sm" tone="muted">{SUPPORT.email}</Text>} onPress={() => open(`mailto:${SUPPORT.email}?subject=${encodeURIComponent('Nafaa support')}`)} />
            <ListRow icon={Globe} title={t('Website')} trailing={<Text ltr size="sm" tone="muted">nafaa.pk</Text>} onPress={() => open(SUPPORT.website)} />
          </ListGroup>
          <Card tone="warning" title={t('Jaldi hal ke liye')}>
            <View style={{ gap: th.space(1.5) }}>
              {[t('Kis page par masla hai, wo batayein.'), t('Screen ka screenshot bhejein.'), t('Bill ya product ka number likhein.'), t('Password ya PIN kabhi kisi ko na bhejein — Nafaa team bhi nahi maangti.')].map((x) => (
                <Text key={x} size="sm">{`• ${x}`}</Text>
              ))}
            </View>
          </Card>
          <ListGroup>
            <ListRow icon={ScrollText} title={t('Terms & privacy')} chevron onPress={() => router.push('/legal' as never)} />
          </ListGroup>
        </View>
      )}
    </Screen>
  );
}
