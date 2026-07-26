import { useRef, useState } from 'react';
import { Camera, Loader2, Trash2, Upload } from 'lucide-react';
import { uploadsApi, type UploadPurpose } from '@/api/uploads.api';
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
  size = 'lg',
  shape = 'circle',
  fallbackText = 'U',
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image too large (max 10 MB)');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files allowed');
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const result = await uploadsApi.single(file, purpose, setProgress);
      onChange(result.url);
      toast.success('Photo uploaded! ✨');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className={cn('inline-flex items-center gap-4', className)}>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          'relative cursor-pointer overflow-hidden bg-surface-muted border-4 border-white shadow-lg hover:shadow-xl transition-all group ring-4 ring-brand-100 dark:ring-brand-900/40',
          sizeMap[size],
          shape === 'circle' ? 'rounded-full' : 'rounded-3xl',
          uploading && 'cursor-wait',
        )}
      >
        {value ? (
          <img src={value} alt="avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-brand text-white font-black text-3xl">
            {fallbackText.charAt(0).toUpperCase()}
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
            <div className="mt-1 text-white text-xs font-black">{progress}%</div>
          </div>
        )}

        {!uploading && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Camera className="h-6 w-6 text-white" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-brand text-white text-xs font-black shadow-md hover:scale-105 transition disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          {value ? 'Change' : 'Upload'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1 text-xs font-bold text-danger hover:text-red-700"
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
