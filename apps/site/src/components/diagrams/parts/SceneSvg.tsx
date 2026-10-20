/**
 * Renders one Scene (one orientation of a diagram) as inline SVG.
 *
 * Layer order: dot-grid canvas, `under` illustration, edges, packets,
 * nodes, pills, pings, `over` illustration. Packets and pings are left out
 * entirely when the diagram does not animate.
 */
import type { ReactNode } from 'react';
import styles from '../diagrams.module.css';
import { wrapText } from '../lib/text';
import type { Scene, SceneEdge, SceneNode, ScenePill, Tone } from '../lib/types';
import { SvgIcon } from './Icon';
import { cx, delayClass, revealClass } from './classes';
import { textWidth } from '../lib/text';

interface SceneSvgProps {
  scene: Scene;
  uid: string;
  title: string;
  desc: string;
  interactive: boolean;
  animate: boolean;
  className?: string;
}

const NODE_TONE: Record<Tone, string | undefined> = {
  neutral: undefined,
  brand: styles.toneBrand,
  info: styles.toneInfo,
  warn: styles.toneWarn,
};
const EDGE_TONE: Record<Tone, string | undefined> = {
  neutral: undefined,
  brand: styles.edgeBrand,
  info: styles.edgeInfo,
  warn: styles.edgeWarn,
};
const PACKET_TONE: Record<Tone, string | undefined> = {
  neutral: undefined,
  brand: styles.packetBrand,
  info: styles.packetInfo,
  warn: styles.packetWarn,
};
const PILL_TONE: Record<Tone, string | undefined> = {
  neutral: undefined,
  brand: styles.pillBrand,
  info: styles.pillInfo,
  warn: styles.pillWarn,
};

const ARROW_TONES = ['neutral', 'brand', 'info', 'warn'] as const;
const ARROW_CLASS: Record<Tone, string | undefined> = {
  neutral: undefined,
  brand: styles.arrowBrand,
  info: styles.arrowInfo,
  warn: styles.arrowWarn,
};

export function SceneSvg({ scene, uid, title, desc, interactive, animate, className }: SceneSvgProps) {
  const titleId = `${uid}-t`;
  const descId = `${uid}-d`;
  const nodeById = new Map(scene.nodes.map((n) => [n.id, n]));
  // Only the arrow markers this scene uses, to keep the DOM small.
  const arrowTones = ARROW_TONES.filter((tone) => scene.edges.some((e) => e.arrow !== false && (e.tone ?? 'neutral') === tone));
  return (
    <svg
      className={className}
      viewBox={`0 0 ${scene.w} ${scene.h}`}
      width={scene.w}
      height={scene.h}
      role={interactive ? 'group' : 'img'}
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <title id={titleId}>{title}</title>
      <desc id={descId}>{desc}</desc>
      <defs>
        <pattern id={`${uid}-grid`} width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1" className={styles.gridDot} />
        </pattern>
        <radialGradient id={`${uid}-fade`} cx="50%" cy="50%" r="72%">
          <stop offset="45%" className={styles.fadeStop} stopOpacity="0" />
          <stop offset="100%" className={styles.fadeStop} stopOpacity="1" />
        </radialGradient>
        {arrowTones.map((tone) => (
          <marker
            key={tone}
            id={`${uid}-arrow-${tone}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            markerUnits="userSpaceOnUse"
            orient="auto-start-reverse"
          >
            <path d="M2 1.5L8 5L2 8.5" className={cx(styles.arrow, ARROW_CLASS[tone])} />
          </marker>
        ))}
      </defs>

      <rect width={scene.w} height={scene.h} fill={`url(#${uid}-grid)`} className={styles.gridBg} />
      <rect width={scene.w} height={scene.h} fill={`url(#${uid}-fade)`} className={styles.fadeBg} />

      {scene.under}

      <g>
        {scene.edges.map((edge) => (
          <EdgeView key={edge.id} edge={edge} uid={uid} />
        ))}
      </g>

      {animate ? (
        <g aria-hidden="true">
          {scene.edges.flatMap((edge) =>
            (edge.packets ?? []).map((packet, i) => (
              <path
                key={`${edge.id}-p${i}`}
                d={edge.d}
                pathLength={1}
                className={cx(styles.packet, PACKET_TONE[packet.tone ?? 'neutral'], delayClass(packet.delay), packet.className)}
              />
            )),
          )}
        </g>
      ) : null}

      <g>
        {scene.nodes.map((node) => (
          <NodeView key={node.id} node={node} scene={scene} />
        ))}
      </g>

      {scene.pills?.map((pill) => <PillView key={pill.id} pill={pill} size={scene.font.pill} />)}

      {animate && scene.pings?.length ? (
        <g aria-hidden="true">
          {scene.pings.map((ping, i) => {
            const n = nodeById.get(ping.node);
            if (!n) return null;
            return (
              <rect
                key={`ping-${i}`}
                x={n.x - 3}
                y={n.y - 3}
                width={n.w + 6}
                height={n.h + 6}
                rx={n.layout === 'stack' ? 18 : 16}
                className={cx(styles.ping, delayClass(ping.delay), ping.className)}
              />
            );
          })}
        </g>
      ) : null}

      {scene.over}
    </svg>
  );
}

function EdgeView({ edge, uid }: { edge: SceneEdge; uid: string }) {
  const tone = edge.tone ?? 'neutral';
  const reveal = edge.reveal ?? 0;
  return (
    <path
      d={edge.d}
      pathLength={edge.dashed ? undefined : 1}
      markerEnd={edge.arrow === false ? undefined : `url(#${uid}-arrow-${tone})`}
      className={cx(
        styles.edge,
        EDGE_TONE[tone],
        edge.dashed ? styles.edgeDashed : undefined,
        edge.dashed ? styles.fade : styles.draw,
        revealClass(reveal),
      )}
    />
  );
}

const RADIUS = 14;

function NodeView({ node, scene }: { node: SceneNode; scene: Scene }) {
  const tone = node.tone ?? 'neutral';
  const { label: labelSize, note: noteSize } = scene.font;
  const stack = node.layout === 'stack';
  const tile = node.icon ? (stack ? 40 : labelSize >= 16 ? 38 : 34) : 0;
  const iconSize = Math.round(tile * 0.53);
  const pad = 14;
  const lineH = labelSize * 1.25;
  const noteH = noteSize * 1.4;

  let body: ReactNode;
  if (stack) {
    const textW = node.w - pad * 2;
    const label = wrapText(node.label, textW, labelSize, 2);
    const note = node.note ? wrapText(node.note, textW, noteSize, 3, 400) : [];
    const cxPos = node.x + node.w / 2;
    const tileY = node.y + 16;
    const textTop = node.icon ? tileY + tile + 12 : node.y + pad;
    const block = label.length * lineH + (note.length ? 4 + note.length * noteH : 0);
    const free = node.y + node.h - pad - textTop;
    const start = textTop + Math.max(0, (free - block) / 2) + labelSize * 0.8;
    body = (
      <>
        {node.icon ? (
          <>
            <rect x={cxPos - tile / 2} y={tileY} width={tile} height={tile} rx={11} className={styles.tile} />
            <SvgIcon name={node.icon} x={cxPos - iconSize / 2} y={tileY + (tile - iconSize) / 2} size={iconSize} className={styles.tileIcon} />
          </>
        ) : null}
        <text x={cxPos} y={start} textAnchor="middle" fontSize={labelSize} className={styles.label}>
          {label.map((line, i) => (
            <tspan key={i} x={cxPos} dy={i === 0 ? 0 : lineH}>
              {line}
            </tspan>
          ))}
        </text>
        {note.length ? (
          <text x={cxPos} y={start + (label.length - 1) * lineH + 4 + noteH} textAnchor="middle" fontSize={noteSize} className={styles.note}>
            {note.map((line, i) => (
              <tspan key={i} x={cxPos} dy={i === 0 ? 0 : noteH}>
                {line}
              </tspan>
            ))}
          </text>
        ) : null}
      </>
    );
  } else {
    const textX = node.x + pad + (tile ? tile + 12 : 0);
    const textW = node.x + node.w - pad - textX;
    const label = wrapText(node.label, textW, labelSize, node.note ? 1 : 2);
    const note = node.note ? wrapText(node.note, textW, noteSize, 2, 400) : [];
    const block = label.length * lineH + (note.length ? 2 + note.length * noteH : 0);
    const cy = node.y + node.h / 2;
    const first = cy - block / 2 + labelSize * 0.92;
    body = (
      <>
        {node.icon ? (
          <>
            <rect x={node.x + pad} y={cy - tile / 2} width={tile} height={tile} rx={10} className={styles.tile} />
            {node.icon === 'nafaa' ? (
              <SvgIcon name="nafaa" x={node.x + pad + 3} y={cy - tile / 2 + 3} size={tile - 6} />
            ) : (
              <SvgIcon name={node.icon} x={node.x + pad + (tile - iconSize) / 2} y={cy - iconSize / 2} size={iconSize} className={styles.tileIcon} />
            )}
          </>
        ) : null}
        <text x={textX} y={first} fontSize={labelSize} className={styles.label} textAnchor={tile ? 'start' : 'middle'}>
          {label.map((line, i) => (
            <tspan key={i} x={tile ? textX : node.x + node.w / 2} dy={i === 0 ? 0 : lineH}>
              {line}
            </tspan>
          ))}
        </text>
        {note.length ? (
          <text x={textX} y={first + (label.length - 1) * lineH + 2 + noteH} fontSize={noteSize} className={styles.note} textAnchor={tile ? 'start' : 'middle'}>
            {note.map((line, i) => (
              <tspan key={i} x={tile ? textX : node.x + node.w / 2} dy={i === 0 ? 0 : noteH}>
                {line}
              </tspan>
            ))}
          </text>
        ) : null}
      </>
    );
  }

  const group = (
    <g className={cx(NODE_TONE[tone], styles.rise, revealClass(node.reveal ?? 0))}>
      {node.badge ? (
        <text x={node.x + node.w / 2} y={node.y - 12} textAnchor="middle" fontSize={scene.font.pill - 1} className={styles.badge}>
          {node.badge}
        </text>
      ) : null}
      <rect x={node.x} y={node.y + 2} width={node.w} height={node.h} rx={RADIUS} className={styles.nodeShadow} />
      <rect x={node.x} y={node.y} width={node.w} height={node.h} rx={RADIUS} className={styles.nodeBox} />
      {node.className ? <g className={node.className}>{body}</g> : body}
    </g>
  );

  if (!node.href) return group;
  return (
    <a href={node.href} aria-label={node.label} className={styles.link}>
      {group}
    </a>
  );
}

/** Width a pill needs for its text and icon. */
export function pillWidth(text: string, size: number, icon?: string): number {
  return Math.ceil(textWidth(text, size, 500) + 24 + (icon ? size + 6 : 0));
}

function PillView({ pill, size }: { pill: ScenePill; size: number }) {
  const h = Math.round(size * 2.15);
  const w = pillWidth(pill.text, size, pill.icon);
  const x = pill.x - w / 2;
  const y = pill.y - h / 2;
  const textX = x + 12 + (pill.icon ? size + 6 : 0);
  return (
    // The reveal and the bespoke phase animation sit on separate groups so
    // their `animation` declarations do not override each other.
    <g className={cx(styles.rise, revealClass(pill.reveal ?? 0))}>
      <g className={cx(PILL_TONE[pill.tone ?? 'neutral'], pill.className)}>
        <rect x={x} y={y} width={w} height={h} rx={h / 2} className={styles.pillBox} />
        {pill.icon ? <SvgIcon name={pill.icon} x={x + 11} y={pill.y - size / 2} size={size} className={styles.pillIcon} strokeWidth={2} /> : null}
        <text x={textX} y={pill.y + size * 0.36} fontSize={size} className={styles.pillText}>
          {pill.text}
        </text>
      </g>
    </g>
  );
}
