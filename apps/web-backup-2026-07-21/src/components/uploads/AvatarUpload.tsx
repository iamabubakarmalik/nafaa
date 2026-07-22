import { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { uploadsApi } from '@/api/uploads.api';
import type { UploadPurpose } from '@/api/uploads.api';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

interface Props {
  value?: string | null;
  onChange: (url: string | null) => void;
  purpose?: UploadPurpose;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'square';
  fallbackText?: string;
  className?: string;
}

const sizeMap = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-32 w-32',
  xl: 'h-40 w-40',
};

export function AvatarUpload({
  value,
  onChange,
  purpose = 'avatar',
  size = 'md',
  shape = 'circle',
  fallbackText = 'N',
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Max size is 10 MB');
      return;
    }
    setUploading(true);
    try {
      const result = await uploadsApi.single(
        { file, name: file.name, type: file.type },
        { purpose },
      );
      onChange(result.url);
      toast.success('Uploaded');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn('inline-flex items-center gap-3', className)}>
      <div
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative cursor-pointer overflow-hidden bg-slate-100 border-2 border-slate-200 hover:border-brand-400 transition-colors group',
          sizeMap[size],
          shape === 'circle' ? 'rounded-full' : 'rounded-2xl',
        )}
      >
        {value ? (
          <img src={value} alt="avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700 font-bold text-2xl">
            {fallbackText.charAt(0).toUpperCase()}
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        )}

        {!uploading && (
          <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Camera className="h-5 w-5 text-white" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold disabled:opacity-50"
        >
          {value ? 'Change' : 'Upload'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700"
          >
            <Trash2 className="h-3 w-3" /> Remove
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          if (inputRef.current) inputRef.current.value = '';
        }}
      />
    </div>
  );
}
