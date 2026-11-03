/** Share button for a report: opens a small sheet with PDF and CSV, then the phone's share sheet (WhatsApp, email, Files). */

import { FileSpreadsheet, FileText, Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { IconButton, ListGroup, ListRow, Sheet, toast } from '@/design';
import { shareCsvDoc, sharePdfDoc, type ReportDoc } from '../lib/doc';

/** `build` runs when the user picks a format, so the document always has the latest data. */
export function ExportButton({ build, disabled }: { build: () => ReportDoc | null; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<'pdf' | 'csv' | null>(null);
  const run = async (kind: 'pdf' | 'csv') => {
    const doc = build();
    if (!doc) return;
    setBusy(kind);
    try {
      setOpen(false);
      await new Promise((r) => setTimeout(r, 350));
      await (kind === 'pdf' ? sharePdfDoc(doc) : shareCsvDoc(doc));
    } catch {
      toast.error(t('File nahi bani, dobara koshish karein'));
    } finally {
      setBusy(null);
    }
  };
  return (
    <>
      <IconButton icon={Share2} label={t('Share')} onPress={() => setOpen(true)} disabled={disabled} />
      <Sheet open={open} onClose={() => setOpen(false)} title={t('Share report')}>
        <View>
          <ListGroup>
            <ListRow icon={FileText} title={t('PDF')} subtitle={t('Print ya WhatsApp ke liye')} chevron onPress={() => run('pdf')} disabled={busy != null} />
            <ListRow icon={FileSpreadsheet} title={t('CSV (Excel)')} subtitle={t('Excel me kholne ke liye')} chevron onPress={() => run('csv')} disabled={busy != null} />
          </ListGroup>
        </View>
      </Sheet>
    </>
  );
}
