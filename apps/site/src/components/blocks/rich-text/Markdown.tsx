/**
 * Renders CMS Markdown (parse.ts) as React elements, server-side.
 *
 * - Headings: H2/H3 only, with unique ids from the page slugger, so the
 *   page keeps one H1 and a clean outline (ARCH 8).
 * - Links: `SmartLink` rules (internal next/link, official sources followed,
 *   unresolved `entry:` links dropped to text).
 * - Images: `![alt](media:<id>)` from the entry's media dictionary through
 *   <CmsImage>; a missing id renders nothing. Other image URLs are not
 *   allowed in the CMS and are skipped.
 * - Code: fenced blocks go through the same highlighter as codeSample.
 * - No HTML is ever injected; everything is an element or escaped text.
 */
import { Fragment, type ReactNode } from 'react';
import type { PublicMedia } from '@/lib/cms/contract/cms-contract';
import { CmsImage, mediaById } from '@/lib/media';
import { CodePanel } from '../parts/CodePanel';
import { SmartLink } from '../parts/SmartLink';
import { strings } from '../lib/i18n';
import { inlineText, parseBlocks, parseInline, type BlockNode, type InlineNode } from './parse';
import { createSlugger, type Slugger } from './slug';
import styles from '../blocks.module.css';

export interface MarkdownOptions {
  media?: Record<string, PublicMedia>;
  slugger?: Slugger;
  locale?: string;
  /** Prefix for code panel ids (unique per page). */
  idPrefix?: string;
  /** `sizes` for images inside the text column. */
  imageSizes?: string;
  /** Render links as plain text (inside a card that is itself a link). */
  plainLinks?: boolean;
}

const MEDIA_SRC = /^media:([A-Za-z0-9_-]{1,64})$/;

/** Link look outside .prose (inline Markdown in cards, facts, intros); inside .prose the prose styles match it. */
const INLINE_LINK =
  'font-medium text-link underline decoration-link/35 decoration-1 underline-offset-[3px] transition-[text-decoration-color] duration-fast hover:decoration-current';

function renderInline(nodes: InlineNode[], opts: MarkdownOptions, key = 'i'): ReactNode[] {
  return nodes.map((node, i) => {
    const k = `${key}${i}`;
    switch (node.t) {
      case 'text':
        return <Fragment key={k}>{node.v}</Fragment>;
      case 'strong':
        return <strong key={k}>{renderInline(node.c, opts, k)}</strong>;
      case 'em':
        return <em key={k}>{renderInline(node.c, opts, k)}</em>;
      case 'del':
        return <del key={k}>{renderInline(node.c, opts, k)}</del>;
      case 'code':
        return <code key={k}>{node.v}</code>;
      case 'br':
        return <br key={k} />;
      case 'link':
        if (opts.plainLinks) return <Fragment key={k}>{renderInline(node.c, opts, k)}</Fragment>;
        return (
          <SmartLink key={k} href={node.href} title={node.title} className={INLINE_LINK}>
            {renderInline(node.c, opts, k)}
          </SmartLink>
        );
      case 'image': {
        const id = MEDIA_SRC.exec(node.src)?.[1];
        const media = mediaById(opts.media, id);
        if (!media) return null;
        return <CmsImage key={k} media={media} alt={node.alt || media.alt} sizes={opts.imageSizes ?? '(min-width: 768px) 680px, 100vw'} />;
      }
    }
  });
}

/** Inline Markdown (InlineMd fields): bold, italic, links, code. No block elements. */
export function InlineMarkdown({ text, opts = {} }: { text: string | null | undefined; opts?: MarkdownOptions }) {
  if (!text) return null;
  return <>{renderInline(parseInline(text), opts)}</>;
}

function soleImage(text: string): InlineNode | null {
  const nodes = parseInline(text.trim());
  return nodes.length === 1 && nodes[0]?.t === 'image' ? nodes[0] : null;
}

function renderBlocks(nodes: BlockNode[], opts: MarkdownOptions & { slugger: Slugger }, tight = false, key = 'b'): ReactNode[] {
  const t = strings(opts.locale ?? 'en');
  return nodes.map((node, i) => {
    const k = `${key}${i}`;
    switch (node.t) {
      case 'heading': {
        const id = opts.slugger.slug(inlineText(node.text));
        const Tag = node.level === 2 ? 'h2' : 'h3';
        return (
          <Tag key={k} id={id}>
            {renderInline(parseInline(node.text), opts, k)}
          </Tag>
        );
      }
      case 'paragraph': {
        const image = soleImage(node.text);
        if (image && image.t === 'image') {
          const media = mediaById(opts.media, MEDIA_SRC.exec(image.src)?.[1]);
          if (!media) return null;
          const caption = image.title || media.caption;
          return (
            <figure key={k}>
              <CmsImage media={media} alt={image.alt || media.alt} sizes={opts.imageSizes ?? '(min-width: 768px) 680px, 100vw'} />
              {caption ? <figcaption>{caption}</figcaption> : null}
            </figure>
          );
        }
        const content = renderInline(parseInline(node.text), opts, k);
        return tight ? <Fragment key={k}>{content}</Fragment> : <p key={k}>{content}</p>;
      }
      case 'list': {
        const Tag = node.ordered ? 'ol' : 'ul';
        const hasTasks = node.items.some((item) => item.checked !== null);
        return (
          <Tag key={k} start={node.ordered && node.start !== 1 ? node.start : undefined} className={hasTasks ? styles.taskList : undefined}>
            {node.items.map((item, j) => (
              <li key={`${k}-${j}`} data-checked={item.checked === null ? undefined : String(item.checked)}>
                {item.checked !== null ? (
                  <span className={styles.taskBox} aria-label={item.checked ? 'Done' : 'Not done'} role="img">
                    {item.checked ? (
                      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                        <path d="M4 8.5 6.8 11 12 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : null}
                  </span>
                ) : null}
                {renderBlocks(item.children, opts, !node.loose, `${k}-${j}-`)}
              </li>
            ))}
          </Tag>
        );
      }
      case 'blockquote':
        return <blockquote key={k}>{renderBlocks(node.children, opts, false, `${k}-`)}</blockquote>;
      case 'code':
        return (
          <CodePanel
            key={k}
            id={`${opts.idPrefix ?? 'md'}-${k}`}
            tabs={[{ label: '', language: node.lang, code: node.text }]}
            label={t.code}
            copyLabel={t.copy}
            copiedLabel={t.copied}
          />
        );
      case 'table':
        return (
          <div key={k} className={styles.mdTable} role="region" aria-label={inlineText(node.head.join(', '))} tabIndex={0}>
            <table>
              <thead>
                <tr>
                  {node.head.map((cell, j) => (
                    <th key={j} scope="col" data-align={node.align[j] ?? undefined}>
                      {renderInline(parseInline(cell), opts, `${k}h${j}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {node.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, j) => (
                      <td key={j} data-align={node.align[j] ?? undefined}>
                        {renderInline(parseInline(cell), opts, `${k}r${r}c${j}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'hr':
        return <hr key={k} />;
    }
  });
}

/** Block Markdown (Md fields): the full subset. Wrap it in <Prose> for long-form styling. */
export function Markdown({ text, opts = {} }: { text: string | null | undefined; opts?: MarkdownOptions }) {
  if (!text?.trim()) return null;
  const slugger = opts.slugger ?? createSlugger();
  return <>{renderBlocks(parseBlocks(text), { ...opts, slugger })}</>;
}

/**
 * The H2/H3 outline of some Markdown, with the ids Markdown would give them
 * when rendered with the same slugger. Templates use it for a table of
 * contents (call it on the page's richText blocks in order, before render,
 * with a fresh slugger; then render with another fresh slugger).
 */
export function markdownHeadings(text: string, slugger: Slugger = createSlugger()): { level: 2 | 3; text: string; id: string }[] {
  const out: { level: 2 | 3; text: string; id: string }[] = [];
  const walk = (nodes: BlockNode[]) => {
    for (const node of nodes) {
      if (node.t === 'heading') {
        const plain = inlineText(node.text);
        out.push({ level: node.level, text: plain, id: slugger.slug(plain) });
      } else if (node.t === 'blockquote') walk(node.children);
      else if (node.t === 'list') node.items.forEach((item) => walk(item.children));
    }
  };
  walk(parseBlocks(text));
  return out;
}
