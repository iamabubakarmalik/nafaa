/**
 * Message box: text (emoji come from the phone keyboard), attach pictures
 * from the camera or gallery (screenshots live there) or a PDF, and the
 * message being replied to or edited above the box. Picked files wait in a
 * strip above the box so a caption can go with them.
 *
 * Voice notes cannot be recorded in this app yet (no recorder in the current
 * binaries, see lib/capabilities.ts); the team's voice notes still play.
 */

import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, FileText, ImagePlus, Paperclip, Pencil, Reply, SendHorizontal, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/core/i18n';
import { Icon, IconButton, ListGroup, ListRow, PressableScale, Sheet, Text, toast, useTheme } from '@/design';
import { SUPPORT_LIMITS, type LocalFile } from '../api/support';
import { sizeText } from '../lib/format';
import { previewText, senderLabel, useSupportStore } from '../store';

interface Staged extends LocalFile { id: string }

let stagedSeq = 0;
const stage = (f: LocalFile): Staged => ({ ...f, id: `s-${++stagedSeq}` });
const MAX_STAGED = SUPPORT_LIMITS.maxAttachments * 2;

function extOf(mime: string) {
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'jpg';
}

function fromPicker(a: ImagePicker.ImagePickerAsset): LocalFile {
  const mime = a.mimeType || (a.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
  return { uri: a.uri, name: a.fileName || `photo-${Date.now()}.${extOf(mime)}`, mime, bytes: a.fileSize ?? 0, width: a.width, height: a.height };
}

export function Composer({ disabled }: { disabled?: boolean }) {
  const th = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [staged, setStaged] = useState<Staged[]>([]);
  const [attachOpen, setAttachOpen] = useState(false);
  const input = useRef<TextInput>(null);
  const replyTo = useSupportStore((s) => s.replyTo);
  const editing = useSupportStore((s) => s.editing);
  const setReplyTo = useSupportStore((s) => s.setReplyTo);
  const setEditing = useSupportStore((s) => s.setEditing);
  const sendText = useSupportStore((s) => s.sendText);
  const sendFiles = useSupportStore((s) => s.sendFiles);
  const editMessage = useSupportStore((s) => s.editMessage);
  const setTyping = useSupportStore((s) => s.setTyping);

  // Editing puts the old text in the box; replying focuses it.
  useEffect(() => {
    if (editing) { setText(editing.text ?? ''); input.current?.focus(); }
  }, [editing]);
  useEffect(() => { if (replyTo) input.current?.focus(); }, [replyTo]);

  const add = (files: LocalFile[]) => {
    if (!files.length) return;
    setStaged((prev) => {
      const room = MAX_STAGED - prev.length;
      if (files.length > room) toast.warning(t('Ek waqt mein zyada se zyada {{count}} files', { count: MAX_STAGED }));
      return [...prev, ...files.slice(0, Math.max(0, room)).map(stage)];
    });
  };

  const pickImages = async (camera: boolean) => {
    setAttachOpen(false);
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { toast.warning(camera ? t('Camera ki ijazat chahiye') : t('Gallery ki ijazat chahiye')); return; }
    const opts: ImagePicker.ImagePickerOptions = camera
      ? { mediaTypes: ['images'], quality: 0.8 }
      : { mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: true, selectionLimit: SUPPORT_LIMITS.maxAttachments };
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled) return;
    add(res.assets.map(fromPicker));
  };

  const pickFile = async () => {
    setAttachOpen(false);
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], multiple: true, copyToCacheDirectory: true });
    if (res.canceled) return;
    add(res.assets.map((a) => ({ uri: a.uri, name: a.name || `file-${Date.now()}`, mime: a.mimeType || 'application/octet-stream', bytes: a.size ?? 0 })));
  };

  const submit = async () => {
    const value = text.trim();
    if (editing) {
      if (!value) return;
      setText('');
      await editMessage(editing.id, value);
      return;
    }
    if (staged.length) {
      sendFiles(staged, value || undefined);
      setStaged([]);
      setText('');
      return;
    }
    if (!value) return;
    sendText(value);
    setText('');
  };

  const quoted = editing ?? replyTo;
  const canSend = !disabled && (!!text.trim() || (!editing && staged.length > 0));

  return (
    <View style={{ backgroundColor: th.colors.surface, borderTopWidth: 1, borderTopColor: th.colors.divider, paddingHorizontal: th.space(2), paddingTop: th.space(2), paddingBottom: Math.max(insets.bottom, th.space(2)), gap: th.space(2) }}>
      {quoted && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), paddingHorizontal: th.space(2), paddingVertical: th.space(1.5), borderRadius: th.radius('md'), backgroundColor: th.colors.surfaceMuted, borderStartWidth: 3, borderStartColor: th.colors.brand.solid }}>
          <Icon icon={editing ? Pencil : Reply} size={16} tone="brand" flip={!editing} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text size="xs" weight="semibold" tone="brand" numberOfLines={1}>{editing ? t('Message edit karein') : senderLabel(quoted)}</Text>
            <Text size="xs" tone="muted" numberOfLines={1}>{previewText(quoted)}</Text>
          </View>
          <IconButton icon={X} label={t('Cancel')} size="sm" onPress={() => { if (editing) { setEditing(null); setText(''); } else setReplyTo(null); }} />
        </View>
      )}

      {staged.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
          {staged.map((s) => (
            <View key={s.id} style={{ width: 64, height: 64, borderRadius: th.radius('md'), overflow: 'hidden', backgroundColor: th.colors.surfaceMuted, borderWidth: 1, borderColor: th.colors.border, alignItems: 'center', justifyContent: 'center' }}>
              {s.mime.startsWith('image/')
                ? <Image source={{ uri: s.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                : (
                  <View style={{ alignItems: 'center', padding: 4 }}>
                    <Icon icon={FileText} size={20} color={th.colors.danger.text} />
                    <Text size="2xs" tone="muted" numberOfLines={1} ltr>{s.bytes ? sizeText(s.bytes) : 'PDF'}</Text>
                  </View>
                )}
              <PressableScale
                onPress={() => setStaged((prev) => prev.filter((x) => x.id !== s.id))}
                accessibilityLabel={t('Hatayein')}
                style={{ position: 'absolute', top: 2, end: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: th.colors.overlay, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon icon={X} size={13} color="#fff" />
              </PressableScale>
            </View>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: th.space(1) }}>
        {!editing && <IconButton icon={Paperclip} label={t('Screenshot ya file bhejein')} disabled={disabled} onPress={() => setAttachOpen(true)} />}
        <View style={{ flex: 1, minHeight: 44, maxHeight: 140, justifyContent: 'center', borderRadius: 22, backgroundColor: th.colors.surfaceMuted, borderWidth: 1, borderColor: th.colors.border, paddingHorizontal: th.space(3.5) }}>
          <TextInput
            ref={input}
            value={text}
            onChangeText={(v) => { setText(v); setTyping(!!v.trim()); }}
            onBlur={() => setTyping(false)}
            editable={!disabled}
            multiline
            maxLength={SUPPORT_LIMITS.maxTextChars}
            placeholder={staged.length ? t('Kuch likhna ho to likhein…') : t('Apna message likhein…')}
            placeholderTextColor={th.colors.textSubtle}
            accessibilityLabel={t('Apna message likhein…')}
            style={{
              ...th.type('base', th.rtl), color: th.colors.text, fontFamily: th.fontFamily('regular', th.rtl ? 'urdu' : 'latin'),
              paddingTop: 11, paddingBottom: 11, textAlign: th.rtl ? 'right' : 'left', maxHeight: 136,
            }}
          />
        </View>
        <IconButton icon={SendHorizontal} label={editing ? t('Save') : t('Bhejein')} variant="primary" flip disabled={!canSend} onPress={() => void submit()} />
      </View>

      <Sheet open={attachOpen} onClose={() => setAttachOpen(false)} title={t('Screenshot ya file bhejein')}>
        <ListGroup>
          <ListRow icon={ImagePlus} iconTone="info" title={t('Gallery')} subtitle={t('Photo ya screenshot chunein')} chevron onPress={() => void pickImages(false)} />
          <ListRow icon={Camera} iconTone="success" title={t('Camera')} subtitle={t('Abhi photo lein')} chevron onPress={() => void pickImages(true)} />
          <ListRow icon={FileText} iconTone="danger" title={t('PDF file')} subtitle={t('{{mb}} MB tak', { mb: Math.round(SUPPORT_LIMITS.maxFileBytes / 1024 / 1024) })} chevron onPress={() => void pickFile()} />
        </ListGroup>
        <Text size="xs" tone="muted" align="center" style={{ marginTop: th.space(3) }}>{t('Issue ka screenshot bhejne se jaldi help hoti hai')}</Text>
      </Sheet>
    </View>
  );
}
