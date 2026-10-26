'use client';

/**
 * Barcode generator island: EAN-13 or Code 128, one code per line with an
 * optional label ("code, label"), drawn as SVG by the encoders in
 * barcode.ts. The label sheet prints on A4 (or saves as PDF) with the
 * chosen number of columns and copies; each code also downloads as SVG for
 * packaging artwork. In-store EAN-13 numbers can be made from the GS1
 * restricted-circulation range (see facts.ts). Nothing leaves the browser.
 */
import { useMemo, useState } from 'react';
import { encodeCode128, encodeEan13, isEanGuard } from './barcode';
import { BARCODE } from './facts';
import { parseAmount } from './format';
import { Field, Glyph, InputsPanel, Segmented, SmallButton, SourceNote, ToolFrame, useToolUsed } from './kit';
import styles from './tools.module.css';

type Kind = 'ean13' | 'code128';

interface Symbol {
  line: number;
  label: string;
  text: string;
  modules: string;
  kind: Kind;
}

const BAR_H = 50;
const GUARD_EXTRA = 5;
const MAX_CODES = 60;

function quiet(kind: Kind): [number, number] {
  return kind === 'ean13' ? [11, 7] : [10, 10];
}

/** Bars as [x, width, isGuard] runs, so the SVG has one rect per bar instead of per module. */
function runs(sym: Symbol): [number, number, boolean][] {
  const out: [number, number, boolean][] = [];
  const [left] = quiet(sym.kind);
  let i = 0;
  while (i < sym.modules.length) {
    if (sym.modules[i] === '1') {
      let j = i;
      while (j < sym.modules.length && sym.modules[j] === '1') j++;
      out.push([left + i, j - i, sym.kind === 'ean13' && isEanGuard(i)]);
      i = j;
    } else i++;
  }
  return out;
}

function geometry(sym: Symbol) {
  const [left, right] = quiet(sym.kind);
  const width = left + sym.modules.length + right;
  const height = BAR_H + GUARD_EXTRA + 11;
  return { left, width, height };
}

/** Human-readable digits: EAN-13 in its three groups, Code 128 centred. */
function captions(sym: Symbol): { x: number; text: string; anchor: 'start' | 'middle' | 'end' }[] {
  const { left, width } = geometry(sym);
  if (sym.kind === 'ean13') {
    return [
      { x: left - 2, text: sym.text[0]!, anchor: 'end' },
      { x: left + 3 + 21, text: sym.text.slice(1, 7), anchor: 'middle' },
      { x: left + 50 + 21, text: sym.text.slice(7), anchor: 'middle' },
    ];
  }
  return [{ x: width / 2, text: sym.text, anchor: 'middle' }];
}

function BarcodeSvg({ sym, showText, className }: { sym: Symbol; showText: boolean; className?: string }) {
  const { width, height } = geometry(sym);
  const textY = BAR_H + GUARD_EXTRA + 8;
  return (
    <svg
      role="img"
      aria-label={`${sym.kind === 'ean13' ? 'EAN-13' : 'Code 128'} barcode ${sym.text}`}
      viewBox={`0 0 ${width} ${showText ? height : BAR_H + GUARD_EXTRA}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width={width} height={height} fill="#fff" />
      {runs(sym).map(([x, w, guard]) => (
        <rect key={x} x={x} y={0} width={w} height={BAR_H + (guard || sym.kind === 'code128' ? GUARD_EXTRA : 0)} fill="#000" />
      ))}
      {showText
        ? captions(sym).map((c) => (
            <text key={c.x} x={c.x} y={textY} textAnchor={c.anchor} fontFamily="ui-monospace, Menlo, monospace" fontSize={8} fill="#000">
              {c.text}
            </text>
          ))
        : null}
    </svg>
  );
}

function svgFile(sym: Symbol): string {
  const { width, height } = geometry(sym);
  const bars = runs(sym)
    .map(([x, w, guard]) => `<rect x="${x}" y="0" width="${w}" height="${BAR_H + (guard || sym.kind === 'code128' ? GUARD_EXTRA : 0)}"/>`)
    .join('');
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const text = captions(sym)
    .map((c) => `<text x="${c.x}" y="${BAR_H + GUARD_EXTRA + 8}" text-anchor="${c.anchor}" font-family="monospace" font-size="8">${esc(c.text)}</text>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width * 4}" height="${height * 4}"><rect width="${width}" height="${height}" fill="#fff"/><g fill="#000">${bars}${text}</g></svg>`;
}

function downloadSvg(sym: Symbol) {
  const url = URL.createObjectURL(new Blob([svgFile(sym)], { type: 'image/svg+xml' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `barcode-${sym.text.replace(/[^\w-]+/g, '_')}.svg`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseLines(raw: string, kind: Kind): { symbols: Symbol[]; errors: string[] } {
  const symbols: Symbol[] = [];
  const errors: string[] = [];
  raw.split('\n').forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return;
    const comma = line.indexOf(',');
    const code = (comma >= 0 ? line.slice(0, comma) : line).trim();
    const label = comma >= 0 ? line.slice(comma + 1).trim() : '';
    const enc = kind === 'ean13' ? encodeEan13(code) : encodeCode128(code);
    if (!enc.ok) errors.push(`Line ${index + 1}: ${enc.error}`);
    else if (symbols.length < MAX_CODES) symbols.push({ line: index + 1, label, text: 'digits' in enc ? enc.digits : enc.text, modules: enc.modules, kind });
  });
  return { symbols, errors };
}

/** In-store EAN-13 numbers: prefix 2, a fixed shop digit block, then a running number; check digit added by the encoder. */
function inStoreNumbers(count: number, start: number): string {
  return Array.from({ length: count }, (_, i) => `2000000${String(start + i).padStart(5, '0')}`).join('\n');
}

export default function BarcodeGenerator() {
  const used = useToolUsed('barcode-generator');
  const [kind, setKind] = useState<Kind>('ean13');
  const [raw, setRaw] = useState('');
  const [copies, setCopies] = useState('1');
  const [columns, setColumns] = useState<'3' | '4' | '5'>('4');
  const [showText, setShowText] = useState<'yes' | 'no'>('yes');

  const { symbols, errors } = useMemo(() => parseLines(raw, kind), [raw, kind]);
  const copiesEach = Math.min(Math.max(Math.round(parseAmount(copies) ?? 1), 1), 100);
  const labels = symbols.flatMap((s) => Array.from({ length: copiesEach }, (_, i) => ({ s, key: `${s.line}-${i}` })));

  const touch = <T,>(setter: (v: T) => void) => (v: T) => {
    used();
    setter(v);
  };

  return (
    <ToolFrame label="Barcode generator">
      <InputsPanel className="space-y-5">
        <Segmented
          legend="Barcode type"
          value={kind}
          onChange={touch(setKind)}
          options={[
            { value: 'ean13', label: 'EAN-13 (retail)' },
            { value: 'code128', label: 'Code 128 (SKU, any text)' },
          ]}
        />
        <div>
          <label htmlFor="barcode-lines" className="mb-1.5 block text-small font-medium text-fg-strong">
            Codes, one per line
          </label>
          <textarea
            id="barcode-lines"
            value={raw}
            onChange={(e) => {
              used();
              setRaw(e.target.value);
            }}
            rows={6}
            spellCheck={false}
            placeholder={kind === 'ean13' ? '200000000001, Chai 190g\n200000000002, Rusk 400g' : 'SKU-001, Kurta M White\nSKU-002, Kurta L White'}
            aria-describedby="barcode-lines-hint"
            className="w-full rounded-md border border-line-strong bg-surface px-3 py-2.5 font-mono text-small text-fg-strong outline-none transition-colors duration-fast placeholder:text-fg-subtle/70 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
          />
          <p id="barcode-lines-hint" className="mt-1.5 text-small text-fg-subtle">
            {kind === 'ean13'
              ? 'Type 12 digits and the check digit is added, or 13 digits to check it. Add a comma and a label to print a name or price.'
              : 'Letters, digits and symbols such as - . / work. Add a comma and a label to print a name or price.'}
          </p>
          {kind === 'ean13' ? (
            <SmallButton
              variant="ghost"
              className="-ml-2 mt-2"
              onClick={() => {
                used();
                const existing = raw.trim() ? `${raw.trim()}\n` : '';
                setRaw(existing + inStoreNumbers(10, symbols.length + 1));
              }}
            >
              {Glyph.plus} Add 10 in-store numbers
            </SmallButton>
          ) : null}
        </div>
        {errors.length ? (
          <ul className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-small text-fg-strong" aria-live="polite">
            {errors.slice(0, 6).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Copies of each" value={copies} onChange={touch(setCopies)} inputMode="numeric" />
          <Segmented
            legend="Labels per row"
            value={columns}
            onChange={touch(setColumns)}
            options={[
              { value: '3', label: '3' },
              { value: '4', label: '4' },
              { value: '5', label: '5' },
            ]}
          />
          <Segmented
            legend="Digits under bars"
            value={showText}
            onChange={touch(setShowText)}
            options={[
              { value: 'yes', label: 'Show' },
              { value: 'no', label: 'Hide' },
            ]}
          />
        </div>
        {kind === 'ean13' ? (
          <SourceNote source={BARCODE.source}>
            Numbers starting {BARCODE.inStorePrefixes.split('-')[0]} to {BARCODE.inStorePrefixes.split('-')[1]} are restricted-circulation numbers: fine for labels used
            inside your own shop, not for goods you supply to other shops. Those need numbers registered with GS1 Pakistan.
          </SourceNote>
        ) : null}
      </InputsPanel>

      <div className="min-w-0 space-y-3 lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:self-start">
        <div className="max-h-[32rem] overflow-auto rounded-lg border border-line bg-white shadow-e2">
          <article aria-label="Label sheet preview" className={`${styles.sheet} p-3`}>
            {labels.length ? (
              <div className="grid grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-2" style={{ '--cols': columns }}>
                {labels.map(({ s, key }) => (
                  <div key={key} className="break-inside-avoid rounded border border-dashed border-slate-300 px-1.5 py-1 text-center text-slate-900">
                    {s.label ? <p className="truncate text-[10px] font-medium leading-tight">{s.label}</p> : null}
                    <BarcodeSvg sym={s} showText={showText === 'yes'} className="mx-auto mt-0.5 block h-auto w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-8 text-center text-sm text-slate-500">Your barcodes appear here.</p>
            )}
          </article>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SmallButton
            variant="primary"
            onClick={() => {
              used();
              window.print();
            }}
          >
            {Glyph.printer} Print labels or save as PDF
          </SmallButton>
          {symbols[0] ? (
            <SmallButton onClick={() => downloadSvg(symbols[0]!)} ariaLabel={`Download ${symbols[0].text} as SVG`}>
              Download first as SVG
            </SmallButton>
          ) : null}
        </div>
        <p className="text-small text-fg-subtle">
          {symbols.length} {symbols.length === 1 ? 'code' : 'codes'}, {labels.length} labels. Print at 100% scale and test-scan one label before printing a full sheet.
        </p>
      </div>
    </ToolFrame>
  );
}
