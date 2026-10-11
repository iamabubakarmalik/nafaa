/**
 * PrintDoc → downloadable A4 PDF, drawn as real text and tables (sharp at
 * any zoom, searchable, small). jsPDF is loaded only when a PDF is made.
 */

import type { PrintDoc, RenderContext } from './types';

// The built-in PDF fonts cover Latin-1; swap characters outside it.
const clean = (s: unknown) => String(s ?? '')
  .replace(/[−–]/g, '-').replace(/—/g, ' - ').replace(/→/g, '->')
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/•/g, '-')
  .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');

const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

async function loadImage(url: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const blob = await fetch(url, { mode: 'cors' }).then((r) => (r.ok ? r.blob() : Promise.reject()));
    const data = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(blob); });
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = data; });
    return { data, w: img.naturalWidth, h: img.naturalHeight };
  } catch {
    return null;
  }
}

export const pdfFileName = (doc: PrintDoc) =>
  `${[doc.title, doc.subtitle].filter(Boolean).join(' - ').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 80) || 'nafaa'}.pdf`;

export async function renderPdf(doc: PrintDoc, ctx: RenderContext): Promise<Blob> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const M = 14;
  const ink: [number, number, number] = [15, 23, 42];
  const muted: [number, number, number] = [100, 116, 139];
  const accent = ctx.color ? rgb(ctx.accent) : ink;
  const soft: [number, number, number] = ctx.color ? accent.map((c) => Math.round(c + (255 - c) * 0.9)) as [number, number, number] : [241, 245, 249];
  let y = M;

  // Header: business on the left, logo on the right.
  const logo = ctx.showLogo && ctx.biz.logoUrl ? await loadImage(ctx.biz.logoUrl) : null;
  if (logo) {
    const h = 14;
    const w = Math.min(40, (logo.w / logo.h) * h);
    pdf.addImage(logo.data, W - M - w, y - 2, w, h);
  }
  pdf.setFont('helvetica', 'bold').setFontSize(14).setTextColor(...accent).text(clean(ctx.biz.name), M, y + 3);
  pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...muted);
  let hy = y + 8;
  if (ctx.showAddress && ctx.biz.address) { pdf.text(clean(ctx.biz.address), M, hy); hy += 4.2; }
  if (ctx.showPhone && ctx.biz.phone) { pdf.text(clean(ctx.biz.phone), M, hy); hy += 4.2; }
  y = Math.max(hy, y + 14) + 1;
  pdf.setDrawColor(...accent).setLineWidth(0.7).line(M, y, W - M, y);
  y += 8;

  pdf.setFont('helvetica', 'bold').setFontSize(16).setTextColor(...ink).text(clean(doc.title), M, y);
  y += 6;
  if (doc.subtitle) { pdf.setFont('helvetica', 'normal').setFontSize(10).setTextColor(71, 85, 105).text(clean(doc.subtitle), M, y); y += 5.5; }
  if (doc.meta?.length) {
    pdf.setFontSize(9).setTextColor(51, 65, 85);
    pdf.text(clean(doc.meta.map(([k, v]) => `${k}: ${v}`).join('     ')), M, y);
    y += 5;
  }

  const head = (title: string) => {
    if (y > 270) { pdf.addPage(); y = M; }
    pdf.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...accent).text(clean(title.toUpperCase()), M, y + 4);
    y += 6;
  };
  const after = () => { y = ((pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 5; };

  for (const s of doc.sections) {
    if (s.title) head(s.title);
    if (s.kind === 'text') {
      pdf.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...ink);
      const lines = pdf.splitTextToSize(clean(s.text), W - 2 * M);
      pdf.text(lines, M, y + 4);
      y += lines.length * 4.6 + 3;
      continue;
    }
    if (s.kind === 'rows') {
      autoTable(pdf, {
        startY: y, margin: { left: M, right: M }, theme: 'plain',
        styles: { font: 'helvetica', fontSize: 9.5, textColor: ink, cellPadding: { top: 1.6, bottom: 1.6, left: 1.5, right: 1.5 }, lineColor: [226, 232, 240], lineWidth: { bottom: 0.2 } },
        columnStyles: { 1: { halign: 'right' } },
        body: s.rows.map((r) => [r.sub ? `    ${clean(r.label)}` : clean(r.label), clean(r.value)]),
        didParseCell: (d) => {
          const r = s.rows[d.row.index];
          if (r?.strong) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.lineWidth = { top: 0.4 }; d.cell.styles.lineColor = ink; }
          if (r?.sub) d.cell.styles.textColor = [71, 85, 105];
        },
      });
      after();
      continue;
    }
    const groups = new Set(s.groupRows ?? []);
    autoTable(pdf, {
      startY: y, margin: { left: M, right: M }, theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, textColor: ink, cellPadding: 1.8, lineColor: [226, 232, 240], lineWidth: 0.2 },
      headStyles: { fillColor: ctx.color ? accent : [226, 232, 240], textColor: ctx.color ? 255 : ink, fontStyle: 'bold' },
      footStyles: { fillColor: [248, 250, 252], textColor: ink, fontStyle: 'bold' },
      columnStyles: Object.fromEntries(s.columns.map((c, i) => [i, { halign: c.align === 'right' ? 'right' : 'left' }])),
      head: [s.columns.map((c) => clean(c.label))],
      body: s.rows.map((r) => r.map(clean)),
      foot: s.footer ? [s.footer.map(clean)] : undefined,
      didParseCell: (d) => {
        if (d.section === 'body' && groups.has(d.row.index)) { d.cell.styles.fillColor = soft; d.cell.styles.fontStyle = 'bold'; }
      },
    });
    after();
  }

  const note = [doc.footer, ctx.footerNote].filter(Boolean) as string[];
  if (note.length) {
    pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(51, 65, 85);
    note.forEach((n) => { if (y > 280) { pdf.addPage(); y = M; } pdf.text(clean(n), W / 2, y + 3, { align: 'center' }); y += 5; });
  }

  // Page numbers and stamp on every page.
  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...muted);
    pdf.text(clean(ctx.stamp ?? ''), M, 290);
    pdf.text(`${i} / ${pages}`, W - M, 290, { align: 'right' });
  }
  return pdf.output('blob');
}
