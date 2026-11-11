/**
 * Website media library: images, screenshots, logos and files used on the
 * site. Search, kind, tag and paging run on the server. Every file needs alt
 * text.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, FileImage, ImagePlus, Lightbulb, Tag, Upload } from 'lucide-react';
import { PageHero, PageShell, heroButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import type { AdminMedia } from '../contract/cms-contract';
import { Card } from '../dashboard/shared/ui';
import { MediaBrowser } from './MediaBrowser';
import { MediaDetailDrawer } from './MediaDetailDrawer';
import { MediaUploadDialog } from './MediaUploadDialog';
import { mediaApi } from './media.api';

export function MediaLibraryPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<AdminMedia | null>(null);
  const all = useQuery({ queryKey: ['cms-media', 'count', 'all'], queryFn: () => mediaApi.list({ limit: 1 }), staleTime: 60_000 });
  const unused = useQuery({ queryKey: ['cms-media', 'count', 'unused'], queryFn: () => mediaApi.list({ unused: true, limit: 1 }), staleTime: 60_000 });
  const total = all.data?.meta.total ?? 0;
  const unusedTotal = unused.data?.meta.total ?? 0;

  return (
    <PageShell>
      <PageHero
        title="Media"
        chip={all.data ? `${total} files` : undefined}
        loading={all.isLoading}
        actions={
          <>
            <button type="button" className={heroPrimaryButton} onClick={() => setUploading(true)}><Upload className="h-4 w-4" /> Upload</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={[
          { label: 'Files', value: total },
          { label: 'In use', value: Math.max(0, total - unusedTotal) },
          { label: 'Unused', value: unusedTotal, hint: 'Safe to delete' },
        ]}
      />
      <Card>
        <MediaBrowser onSelect={setSelected} selectedId={selected?.id} />
      </Card>
      <MediaUploadDialog
        open={uploading}
        onClose={() => setUploading(false)}
        onUploaded={() => { qc.invalidateQueries({ queryKey: ['cms-media'] }); }}
      />
      <MediaDetailDrawer media={selected} onClose={() => setSelected(null)} onChanged={(m) => setSelected(m)} />

      {guide.isOpen && (
        <PageGuide
          title="Media"
          description="Pictures, screenshots, logos and files for the website."
          flowTitle="Adding a picture"
          flow={[
            { label: 'Upload', hint: 'Drag a file in', icon: Upload, color: '#4f46e5' },
            { label: 'Write alt text', hint: 'Required', icon: FileImage, color: '#d97706' },
            { label: 'Tag it', hint: 'Industry, city…', icon: Tag, color: '#0284c7' },
            { label: 'Use it', hint: 'In any entry', icon: ImagePlus, color: '#059669' },
          ]}
          steps={[
            { icon: FileImage, color: '#d97706', title: 'Alt text', text: 'Every file needs alt text. It helps search engines and people who cannot see the image.' },
            { icon: Eye, color: '#0284c7', title: 'Unused files', text: 'Switch on Unused only to find files no page uses. Open a file to see where it is used before deleting.' },
            { icon: Tag, color: '#4f46e5', title: 'Tags', text: 'Tags such as industry:retail make files easy to find later.' },
          ]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
