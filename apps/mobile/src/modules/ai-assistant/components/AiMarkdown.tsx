/**
 * A small, safe Markdown renderer for assistant answers: paragraphs, line
 * breaks, bold, italic, code, headings and bullet or numbered lists. Built as
 * React Native text; nothing from the model is ever interpreted as code.
 */

import { Fragment, type ReactNode } from 'react';
import { Text as RNText, View } from 'react-native';
import { Text, useTheme } from '@/design';

const INLINE = /(\*\*[^*\n]+?\*\*|__[^_\n]+?__|`[^`\n]+`|(?<![A-Za-z0-9*])\*(?![\s*])[^*\n]+?(?<!\s)\*(?![A-Za-z0-9*])|(?<![A-Za-z0-9_])_(?![\s_])[^_\n]+?(?<!\s)_(?![A-Za-z0-9_]))/g;

function inline(text: string, key: string, mono: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const tok = m[0];
    const k = `${key}-${i++}`;
    if (tok.startsWith('**') || tok.startsWith('__')) {
      out.push(<RNText key={k} style={{ fontWeight: '700' }}>{inline(tok.slice(2, -2), k, mono)}</RNText>);
    } else if (tok.startsWith('`')) {
      out.push(<RNText key={k} style={{ fontFamily: mono }}>{tok.slice(1, -1)}</RNText>);
    } else {
      out.push(<RNText key={k} style={{ fontStyle: 'italic' }}>{inline(tok.slice(1, -1), k, mono)}</RNText>);
    }
    last = at + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block =
  | { kind: 'p'; lines: string[] }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'h'; text: string };

function blocks(src: string): Block[] {
  const list: Block[] = [];
  for (const raw of src.replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd();
    const bullet = /^\s*(?:[-*•])\s+(.*)$/.exec(line);
    const num = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const head = /^\s*#{1,4}\s+(.*)$/.exec(line);
    const prev = list[list.length - 1];
    if (!line.trim()) { list.push({ kind: 'p', lines: [] }); continue; }
    if (head) { list.push({ kind: 'h', text: head[1] }); continue; }
    if (bullet) {
      if (prev?.kind === 'ul') prev.items.push(bullet[1]); else list.push({ kind: 'ul', items: [bullet[1]] });
      continue;
    }
    if (num) {
      if (prev?.kind === 'ol') prev.items.push(num[1]); else list.push({ kind: 'ol', items: [num[1]] });
      continue;
    }
    if (prev?.kind === 'p' && prev.lines.length) prev.lines.push(line); else list.push({ kind: 'p', lines: [line] });
  }
  return list.filter((b) => !(b.kind === 'p' && !b.lines.length));
}

export function AiMarkdown({ text }: { text: string }) {
  const th = useTheme();
  const mono = 'Menlo';
  const item = (marker: string, body: string, k: string) => (
    <View key={k} style={{ flexDirection: 'row', gap: th.space(2) }}>
      <Text tone="muted" ltr style={{ minWidth: 14 }}>{marker}</Text>
      <Text style={{ flex: 1 }}>{inline(body, k, mono)}</Text>
    </View>
  );
  return (
    <View style={{ gap: th.space(2) }}>
      {blocks(text).map((b, i) => {
        const k = `b${i}`;
        if (b.kind === 'h') return <Text key={k} weight="semibold">{inline(b.text, k, mono)}</Text>;
        if (b.kind === 'ul') return <View key={k} style={{ gap: th.space(1) }}>{b.items.map((it, j) => item('•', it, `${k}-${j}`))}</View>;
        if (b.kind === 'ol') return <View key={k} style={{ gap: th.space(1) }}>{b.items.map((it, j) => item(`${j + 1}.`, it, `${k}-${j}`))}</View>;
        return (
          <Text key={k}>
            {b.lines.map((l, j) => <Fragment key={j}>{j > 0 ? '\n' : ''}{inline(l, `${k}-${j}`, mono)}</Fragment>)}
          </Text>
        );
      })}
    </View>
  );
}
