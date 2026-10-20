/**
 * Website → Media (ARCH 13 screen 4).
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import type { AdminMedia } from '../contract/cms-contract';
import { PageHeader } from '../../_shared/components/PageHeader';
import { Card, btn } from '../dashboard/shared/ui';
import { MediaBrowser } from './MediaBrowser';
import { MediaDetailDrawer } from './MediaDetailDrawer';
import { MediaUploadDialog } from './MediaUploadDialog';

export function MediaLibraryPage() {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<AdminMedia | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media"
        subtitle="Website ki tasveerein, screenshots, logos aur files. Har file ka alt text zaroori hai."
        actions={
          <button className={btn.primary} onClick={() => setUploading(true)}>
            <Upload className="h-4 w-4" /> Upload
          </button>
        }
      />
      <Card>
        <MediaBrowser onSelect={setSelected} selectedId={selected?.id} />
      </Card>
      <MediaUploadDialog
        open={uploading}
        onClose={() => setUploading(false)}
        onUploaded={() => qc.invalidateQueries({ queryKey: ['cms-media'] })}
      />
      <MediaDetailDrawer media={selected} onClose={() => setSelected(null)} onChanged={(m) => setSelected(m)} />
    </div>
  );
}
