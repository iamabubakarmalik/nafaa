/**
 * MediaPicker: a form field that picks one media item from the library or
 * uploads a new one (alt text enforced by the upload dialog). Used by the
 * entry editor (M1), customers, testimonials and settings.
 *
 * Usage:
 *   <MediaPicker value={block.imageId} onChange={(id, media) => ...} kinds={['SCREENSHOT']} />
 *
 * `value` is a CmsMedia id. Pass `media` (e.g. from AdminEntry.mediaRefs) so
 * the preview shows without an extra request.
 */
import { useEffect, useState } from 'react';
import { ImagePlus, Upload, X } from 'lucide-react';
import type { AdminMedia, CmsMediaKind, PublicMedia } from '../contract/cms-contract';
import { Modal, btn } from '../dashboard/shared/ui';
import { MediaBrowser, MediaThumb } from './MediaBrowser';
import { MediaUploadDialog } from './MediaUploadDialog';

export interface MediaPickerProps {
  value: string | null | undefined;
  onChange: (id: string | null, media: PublicMedia | null) => void;
  /** Known media for `value`, so the preview renders without a lookup. */
  media?: PublicMedia | null;
  kinds?: readonly CmsMediaKind[];
  label?: string;
  disabled?: boolean;
}

export function MediaPicker({ value, onChange, media, kinds, label = 'Media chunein', disabled }: MediaPickerProps) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<PublicMedia | null>(media ?? null);

  useEffect(() => {
    if (media) setCurrent(media);
    else if (!value) setCurrent(null);
  }, [media, value]);

  const pick = (m: AdminMedia) => {
    setCurrent(m);
    onChange(m.id, m);
    setOpen(false);
  };

  return (
    <div>
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-neutral-300 bg-white p-2">
          <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md bg-neutral-100">
            {current ? <MediaThumb media={current} /> : null}
          </div>
          <p className="min-w-0 flex-1 truncate text-sm text-neutral-700">{current?.alt ?? `Media ${value}`}</p>
          {!disabled && (
            <div className="flex gap-1">
              <button type="button" className={btn.ghost} onClick={() => setOpen(true)}>Badlein</button>
              <button type="button" className={btn.icon} aria-label="Hatayein" onClick={() => { setCurrent(null); onChange(null, null); }}>
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <button type="button" disabled={disabled} className={btn.secondary} onClick={() => setOpen(true)}>
          <ImagePlus className="h-4 w-4" /> {label}
        </button>
      )}

      <MediaPickerDialog open={open} onClose={() => setOpen(false)} onSelect={pick} kinds={kinds} selectedId={value} />
    </div>
  );
}

/**
 * Library dialog: browse/filter the library or upload a new file (alt text
 * enforced). Same props as the editor's interim MediaPickerDialog, so it can
 * replace it by changing the import.
 */
export function MediaPickerDialog({ open, onClose, onSelect, kinds, selectedId }: {
  open: boolean;
  onClose: () => void;
  onSelect: (media: AdminMedia) => void;
  kinds?: readonly CmsMediaKind[];
  selectedId?: string | null;
}) {
  const [uploading, setUploading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        wide
        title="Media library"
        footer={
          <button type="button" className={btn.secondary} onClick={() => setUploading(true)}>
            <Upload className="h-4 w-4" /> Nayi file upload
          </button>
        }
      >
        <MediaBrowser onSelect={onSelect} selectedId={selectedId} fixedKinds={kinds} pageSize={18} refreshKey={refreshKey} />
      </Modal>
      <MediaUploadDialog
        open={uploading}
        onClose={() => setUploading(false)}
        defaultKind={kinds?.length === 1 ? kinds[0] : undefined}
        onUploaded={(m) => {
          setRefreshKey((k) => k + 1);
          if (kinds && !kinds.includes(m.kind)) return;
          setUploading(false);
          onSelect(m);
        }}
      />
    </>
  );
}
