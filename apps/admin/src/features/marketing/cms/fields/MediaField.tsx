/**
 * Media id field for the editor: thumbnail and alt from the editor's
 * mediaRefs, with the media library's picker dialog (agent M2,
 * media/MediaPicker.tsx: library browse plus upload with required alt text).
 */
import { useState, type ReactNode } from 'react';
import { FileText, ImageIcon, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { CmsMediaKind, PublicMedia } from '../contract/cms-contract';
import { useEditor } from '../editor/EditorContext';
import { MediaPickerDialog } from '../media/MediaPicker';
import { Btn, Field } from './ui';

export { MediaPickerDialog };

/** Cloudinary delivery URL with a width transform (thumbnails). */
export function mediaThumb(url: string, width = 320): string {
  return url.includes('/upload/') ? url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`) : url;
}

export function MediaThumb({ media, className }: { media: PublicMedia | undefined; className?: string }) {
  if (!media) {
    return (
      <div className={cn('grid place-items-center bg-neutral-100 text-neutral-400', className)}>
        <ImageIcon className="h-5 w-5" />
      </div>
    );
  }
  if (media.kind === 'DOCUMENT' || media.kind === 'VIDEO') {
    return (
      <div className={cn('grid place-items-center bg-neutral-100 text-neutral-500', className)}>
        <FileText className="h-5 w-5" />
      </div>
    );
  }
  return <img src={mediaThumb(media.url)} alt={media.alt} loading="lazy" className={cn('object-cover', className)} style={media.dominantColor ? { backgroundColor: media.dominantColor } : undefined} />;
}

export function MediaField({
  value,
  onChange,
  label,
  hint,
  error,
  required,
  kinds,
}: {
  value: string | null | undefined;
  onChange: (id: string | undefined) => void;
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  /** Allowed media kinds (e.g. IMAGE + SCREENSHOT for screenshot blocks). */
  kinds?: readonly CmsMediaKind[];
}) {
  const { mediaRefs, addMedia } = useEditor();
  const [open, setOpen] = useState(false);
  const media = value ? mediaRefs[value] : undefined;
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-2">
          <MediaThumb media={media} className="h-14 w-20 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-neutral-800">{media?.alt ?? 'Media'}</p>
            <p className="truncate font-mono text-[11px] text-neutral-500">
              {media ? `${media.kind} · ${media.width ?? '?'}×${media.height ?? '?'}` : value}
            </p>
          </div>
          <Btn size="sm" variant="ghost" onClick={() => setOpen(true)}>
            Badlein
          </Btn>
          <button type="button" onClick={() => onChange(undefined)} className="p-1 text-neutral-400 hover:text-rose-600" aria-label="Hatayein">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-4 text-sm text-neutral-500 transition hover:border-emerald-400 hover:bg-emerald-50/40 hover:text-emerald-700',
            error ? 'border-rose-300' : 'border-neutral-300',
          )}
        >
          <ImageIcon className="h-4 w-4" /> Media library se chunein
        </button>
      )}
      <MediaPickerDialog
        open={open}
        onClose={() => setOpen(false)}
        kinds={kinds}
        selectedId={value}
        onSelect={(m) => {
          addMedia([m]);
          onChange(m.id);
          setOpen(false);
        }}
      />
    </Field>
  );
}
