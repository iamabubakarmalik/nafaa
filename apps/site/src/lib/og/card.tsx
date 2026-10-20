/**
 * The branded 1200x630 OG card (ARCH 4.7), drawn by Satori through next/og.
 *
 * Layout: logo and wordmark top left; eyebrow, title and summary in a left
 * column; the page URL at the bottom; a visual on the right. The visual is a
 * framed real screenshot when the page has one, else a person photo (PERSON),
 * else the entry's icon on its industry color. A brand grid and a soft accent
 * glow sit behind everything. When an editor sets an OG image, the card is
 * that image, full-bleed, with nothing drawn over it.
 *
 * Satori rules that shape this file: inline styles only, every element with
 * more than one child sets `display: flex`, absolute boxes use left/top plus
 * width/height (Satori ignores `inset`), and images are passed as data URIs
 * (fetched beforehand) so a slow image host cannot fail the render.
 */
import type { ReactElement } from 'react';
import type { IconName } from '@/lib/cms/contract/cms-contract';
import { ICON_NODES } from './icon-nodes';
import { OG_FONT_FAMILY } from './fonts';
import { LOGO_MARK_DATA_URI, OG_COLORS, safeAccent, withAlpha } from './theme';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** Everything the card needs, with images already resolved to data URIs. */
export interface OgCardModel {
  eyebrow: string | null;
  title: string;
  summary: string | null;
  /** Shown at the bottom, e.g. "nafaa.pk/industries/bakery". */
  displayUrl: string | null;
  /** #rrggbb with at least 4.5:1 against white (contract rule for industry colors). */
  accent: string | null;
  icon: IconName | null;
  visual:
    | { kind: 'screenshot'; dataUri: string; addressBar: string | null }
    | { kind: 'photo'; dataUri: string }
    | { kind: 'icon' }
    | { kind: 'fullBleed'; dataUri: string };
}

/** Visual area of the framed screenshot, in card pixels (fetch at this size). */
export const SCREENSHOT_BOX = { left: 700, top: 132, width: 600, imageHeight: 460 } as const;
/** Diameter of the person photo. */
export const PHOTO_SIZE = 300;

const TEXT_COLUMN_WIDTH = 600;

function titleSize(title: string): number {
  const length = title.length;
  if (length <= 28) return 72;
  if (length <= 48) return 62;
  if (length <= 80) return 52;
  return 44;
}

function IconGlyph({ name, size, color, strokeWidth }: { name: IconName; size: number; color: string; strokeWidth: number }) {
  const node = ICON_NODES[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {node.map(([tag, attrs], index) => {
        const Tag = tag as 'path';
        return <Tag key={index} {...attrs} />;
      })}
    </svg>
  );
}

function Background({ accent }: { accent: string }) {
  const line = withAlpha(OG_COLORS.slate900, 0.045);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: OG_WIDTH, height: OG_HEIGHT, display: 'flex' }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: OG_WIDTH,
          height: OG_HEIGHT,
          backgroundImage: `linear-gradient(to right, ${line} 1px, transparent 1px), linear-gradient(to bottom, ${line} 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: OG_WIDTH - 640,
          top: OG_HEIGHT - 580,
          width: 900,
          height: 900,
          borderRadius: 9999,
          backgroundImage: `radial-gradient(circle at center, ${withAlpha(accent, 0.16)} 0%, ${withAlpha(accent, 0)} 65%)`,
        }}
      />
      <div style={{ position: 'absolute', left: 0, top: 0, width: OG_WIDTH, height: 6, backgroundColor: accent }} />
    </div>
  );
}

function ScreenshotVisual({ dataUri, addressBar }: { dataUri: string; addressBar: string | null }) {
  const { left, top, width, imageHeight } = SCREENSHOT_BOX;
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: width + 40,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 16,
        border: `1px solid ${OG_COLORS.slate200}`,
        backgroundColor: OG_COLORS.white,
        boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.18), 0 2px 6px rgba(15, 23, 42, 0.06)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 44,
          padding: '0 16px',
          backgroundColor: OG_COLORS.slate50,
          borderBottom: `1px solid ${OG_COLORS.slate200}`,
        }}
      >
        <div style={{ display: 'flex', width: 12, height: 12, borderRadius: 9999, backgroundColor: OG_COLORS.slate300, marginRight: 8 }} />
        <div style={{ display: 'flex', width: 12, height: 12, borderRadius: 9999, backgroundColor: OG_COLORS.slate300, marginRight: 8 }} />
        <div style={{ display: 'flex', width: 12, height: 12, borderRadius: 9999, backgroundColor: OG_COLORS.slate300, marginRight: 20 }} />
        {addressBar ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              height: 26,
              padding: '0 14px',
              borderRadius: 8,
              backgroundColor: OG_COLORS.white,
              border: `1px solid ${OG_COLORS.slate200}`,
              color: OG_COLORS.slate500,
              fontSize: 15,
            }}
          >
            {addressBar}
          </div>
        ) : null}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain img only */}
      <img src={dataUri} width={width + 40} height={imageHeight} alt="" style={{ objectFit: 'cover', objectPosition: 'left top' }} />
    </div>
  );
}

function PhotoVisual({ dataUri, accent }: { dataUri: string; accent: string }) {
  const ring = PHOTO_SIZE + 36;
  return (
    <div
      style={{
        position: 'absolute',
        left: 800,
        top: (OG_HEIGHT - ring) / 2,
        width: ring,
        height: ring,
        borderRadius: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: withAlpha(accent, 0.12),
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain img only */}
      <img src={dataUri} width={PHOTO_SIZE} height={PHOTO_SIZE} alt="" style={{ borderRadius: 9999, objectFit: 'cover' }} />
    </div>
  );
}

function IconVisual({ icon, accent }: { icon: IconName | null; accent: string }) {
  const tile = 232;
  const outer = [tile + 152, tile + 76];
  const centerX = 940;
  const centerY = OG_HEIGHT / 2 + 10;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: OG_WIDTH, height: OG_HEIGHT, display: 'flex' }}>
      {outer.map((size, index) => (
        <div
          key={size}
          style={{
            position: 'absolute',
            left: centerX - size / 2,
            top: centerY - size / 2,
            width: size,
            height: size,
            borderRadius: 56 + (index === 0 ? 40 : 20),
            border: `2px solid ${withAlpha(accent, index === 0 ? 0.1 : 0.18)}`,
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          left: centerX - tile / 2,
          top: centerY - tile / 2,
          width: tile,
          height: tile,
          borderRadius: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: icon ? accent : OG_COLORS.white,
          border: icon ? 'none' : `1px solid ${OG_COLORS.slate200}`,
          boxShadow: `0 24px 48px -16px ${withAlpha(accent, 0.45)}`,
        }}
      >
        {icon ? (
          <IconGlyph name={icon} size={120} color={OG_COLORS.white} strokeWidth={1.75} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- Satori renders plain img only
          <img src={LOGO_MARK_DATA_URI} width={150} height={150} alt="" />
        )}
      </div>
    </div>
  );
}

export function OgCard({ model }: { model: OgCardModel }): ReactElement {
  if (model.visual.kind === 'fullBleed') {
    return (
      <div style={{ width: OG_WIDTH, height: OG_HEIGHT, display: 'flex', backgroundColor: OG_COLORS.white }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain img only */}
        <img src={model.visual.dataUri} width={OG_WIDTH} height={OG_HEIGHT} alt="" style={{ objectFit: 'cover' }} />
      </div>
    );
  }

  const accent = safeAccent(model.accent);
  const size = titleSize(model.title);
  const visual = model.visual;

  return (
    <div
      style={{
        width: OG_WIDTH,
        height: OG_HEIGHT,
        position: 'relative',
        display: 'flex',
        backgroundColor: OG_COLORS.white,
        fontFamily: OG_FONT_FAMILY,
        color: OG_COLORS.ink,
      }}
    >
      <Background accent={accent} />

      {visual.kind === 'screenshot' ? <ScreenshotVisual dataUri={visual.dataUri} addressBar={visual.addressBar} /> : null}
      {visual.kind === 'photo' ? <PhotoVisual dataUri={visual.dataUri} accent={accent} /> : null}
      {visual.kind === 'icon' ? <IconVisual icon={model.icon} accent={accent} /> : null}

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          width: TEXT_COLUMN_WIDTH + 72,
          height: '100%',
          padding: '56px 0 52px 72px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain img only */}
          <img src={LOGO_MARK_DATA_URI} width={48} height={48} alt="" />
          <div style={{ display: 'flex', marginLeft: 14, fontSize: 32, fontWeight: 600, letterSpacing: -0.8, color: OG_COLORS.slate900 }}>
            Nafaa
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1 }}>
          {model.eyebrow ? (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 22 }}>
              <div style={{ display: 'flex', width: 10, height: 10, borderRadius: 3, backgroundColor: accent, marginRight: 12 }} />
              <div style={{ display: 'flex', fontSize: 20, fontWeight: 600, letterSpacing: 1.6, textTransform: 'uppercase', color: accent }}>
                {model.eyebrow}
              </div>
            </div>
          ) : null}
          <div
            style={{
              display: 'block',
              fontSize: size,
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: -0.03 * size,
              color: OG_COLORS.ink,
              lineClamp: 3,
              textWrap: model.title.length <= 48 ? 'balance' : 'wrap',
            }}
          >
            {model.title}
          </div>
          {model.summary ? (
            <div
              style={{
                display: 'block',
                marginTop: 22,
                fontSize: 25,
                fontWeight: 400,
                lineHeight: 1.45,
                color: OG_COLORS.slate600,
                lineClamp: size >= 62 ? 3 : 2,
              }}
            >
              {model.summary}
            </div>
          ) : null}
        </div>

        {model.displayUrl ? (
          <div style={{ display: 'flex', fontSize: 21, fontWeight: 400, color: OG_COLORS.slate500 }}>{model.displayUrl}</div>
        ) : null}
      </div>
    </div>
  );
}
