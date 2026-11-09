/**
 * "Post karein" sheet (web PostNowSheet): copy the caption with hashtags,
 * save or share the photos, open the platform app (its website when the app
 * is not installed), then mark the post posted with its link.
 */

import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Copy, ExternalLink, Link2, Rocket, Share2, Undo2 } from 'lucide-react-native';
import { formatDateTime } from '@/core/format';
import { t } from '@/core/i18n';
import { BrandLogo, Button, Input, Sheet, Text, toast, useTheme } from '@/design';
import { apiErrorMessage } from '../../api/online';
import { socialApi, type SocialPlatform, type SocialPost } from '../../api/social';
import { Note } from '../bits';
import { copyText } from '../../lib/device';

export const PLATFORM: Record<SocialPlatform, { label: string; color: string; apps: string[]; web: string }> = {
  FACEBOOK: { label: 'Facebook', color: '#1877F2', apps: ['fb://'], web: 'https://m.facebook.com/' },
  INSTAGRAM: { label: 'Instagram', color: '#E1306C', apps: ['instagram://camera', 'instagram://app'], web: 'https://www.instagram.com/' },
  TIKTOK: { label: 'TikTok', color: '#000000', apps: ['tiktok://', 'snssdk1233://'], web: 'https://www.tiktok.com/upload' },
  YOUTUBE: { label: 'YouTube', color: '#FF0000', apps: ['youtube://'], web: 'https://m.youtube.com/' },
  WHATSAPP_STATUS: { label: 'WhatsApp status', color: '#25D366', apps: ['whatsapp://'], web: 'https://wa.me/' },
};

/** Opens the platform's app, trying each of its link styles, then its website. */
export async function openPlatform(p: SocialPlatform) {
  for (const url of PLATFORM[p].apps) {
    try { await Linking.openURL(url); return; } catch { /* next */ }
  }
  Linking.openURL(PLATFORM[p].web).catch(() => toast.error(t('Link nahi khula')));
}

export function PlatformDot({ p, size = 22 }: { p: SocialPlatform; size?: number }) {
  if (p === 'TIKTOK') return <BrandLogo name="tiktok" size={size} />;
  if (p === 'WHATSAPP_STATUS') return <BrandLogo name="whatsapp" size={size} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: PLATFORM[p].color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.5, fontWeight: '800', lineHeight: size * 0.62 }}>{p === 'FACEBOOK' ? 'f' : p === 'INSTAGRAM' ? 'IG' : '▶'}</Text>
    </View>
  );
}

export const fullCaption = (p: Pick<SocialPost, 'caption' | 'hashtags'>) => [p.caption.trim(), p.hashtags.join(' ')].filter(Boolean).join('\n\n');

/** Saves a photo to the phone's cache and opens the share sheet (save to gallery, Instagram, WhatsApp…). */
async function sharePhoto(url: string, name: string) {
  try {
    const ext = /\.(jpe?g|webp|gif)(\?|$)/i.exec(url)?.[1] ?? 'png';
    const res = await FileSystem.downloadAsync(url, `${FileSystem.cacheDirectory}${name}.${ext}`);
    if (res.status >= 400) throw new Error(String(res.status));
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(res.uri, { mimeType: `image/${ext === 'jpg' ? 'jpeg' : ext}`, dialogTitle: t('Photo') });
  } catch {
    toast.error(t('Photo nahi aayi'));
  }
}

export function PostNowSheet({ post, onClose }: { post: SocialPost | null; onClose: () => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const [urls, setUrls] = useState<Partial<Record<SocialPlatform, string>>>({});
  const mark = useMutation({
    mutationFn: (undo: boolean) => socialApi.posted(post!.id, undo ? { undo: true } : { urls: { ...post!.postUrls, ...urls } }),
    onSuccess: (_r, undo) => {
      qc.invalidateQueries({ queryKey: ['online-social'] });
      toast.success(undo ? t('Wapas "Ready" kar di') : t('Post ho gayi — shabash!'));
      if (!undo) onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  if (!post) return null;
  const text = fullCaption(post);
  const done = post.status === 'POSTED';

  return (
    <Sheet open onClose={onClose} title={t('Post karein')} description={`${post.title || t('Social post')} · ${post.scheduledAt ? formatDateTime(post.scheduledAt) : ''}`}
      footer={done
        ? <Button variant="secondary" icon={Undo2} loading={mark.isPending} onPress={() => mark.mutate(true)}>{t('Posted hataein')}</Button>
        : <Button variant="success" icon={CheckCircle2} loading={mark.isPending} onPress={() => mark.mutate(false)}>{t('Post ho gayi')}</Button>}>
      <View style={{ gap: th.space(4) }}>
        <View style={{ gap: th.space(2), padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text weight="semibold" style={{ flex: 1 }}>{t('Caption')}</Text>
            <Button size="sm" variant="secondary" icon={Copy} disabled={!text} onPress={() => copyText(text, t('Caption copy ho gaya'))}>{t('Copy')}</Button>
          </View>
          <Text size="sm" tone="secondary" selectable>{text || t('Caption abhi khali hai')}</Text>
        </View>

        {post.media.length > 0 && (
          <View style={{ gap: th.space(2) }}>
            <Text weight="semibold">{t('Photos')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: th.space(2) }}>
              {post.media.map((m, i) => (
                <Pressable key={m.url} onPress={() => sharePhoto(m.url, `post-${post.code}-${i + 1}`)} accessibilityLabel={t('Photo save / share')}
                  style={{ width: 96, height: 96, borderRadius: th.radius('md'), overflow: 'hidden', backgroundColor: th.colors.surfaceMuted }}>
                  <Image source={{ uri: m.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  <View style={{ position: 'absolute', end: 4, bottom: 4, borderRadius: 999, padding: 4, backgroundColor: 'rgba(15,23,42,0.6)' }}>
                    <Share2 size={14} color="#fff" />
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            <Text size="xs" tone="muted">{t('Photo dabayein — gallery me save karein ya seedha app me bhejein.')}</Text>
          </View>
        )}

        <View style={{ gap: th.space(2) }}>
          {post.platforms.map((p) => {
            const links = post.taggedLinks[p] ?? [];
            return (
              <View key={p} style={{ gap: th.space(2), padding: th.space(3), borderRadius: th.radius('lg'), borderWidth: 1, borderColor: th.colors.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
                  <PlatformDot p={p} />
                  <Text weight="semibold" style={{ flex: 1 }}>{PLATFORM[p].label}</Text>
                  {links.length > 0 && <Button size="sm" variant="ghost" icon={Link2} onPress={() => copyText(links.map((l) => `${l.label}: ${l.url}`).join('\n'), t('Link copy ho gaya'))}>{t('Link')}</Button>}
                  <Button size="sm" variant="secondary" icon={ExternalLink} onPress={async () => { await copyText(text, t('Caption copy ho gaya')); void openPlatform(p); }}>{t('Kholein')}</Button>
                </View>
                <Input value={urls[p] ?? post.postUrls[p] ?? ''} onChangeText={(v) => setUrls((u) => ({ ...u, [p]: v }))} placeholder={t('Post ka link (zaroori nahi)')}
                  autoCapitalize="none" keyboardType="url" accessibilityLabel={t('{{name}} post ka link', { name: PLATFORM[p].label })} />
              </View>
            );
          })}
        </View>

        <Note tone="info" icon={Rocket}>{t('Khud post (auto-publish) jaldi aa raha hai — is ke liye Meta aur TikTok ki manzoori chahiye. Tab tak Nafaa waqt par yaad dilata hai.')}</Note>
      </View>
    </Sheet>
  );
}
