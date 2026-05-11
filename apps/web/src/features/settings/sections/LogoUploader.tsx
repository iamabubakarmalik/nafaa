import { useRef, useState } from 'react';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';

interface LogoUploaderProps {
  value?: string | null;
  onChange: (url: string) => void;
  purpose?: string;
  size?: number;
  label?: string;
}

export default function LogoUploader({
  value,
  onChange,
  purpose = 'logo',
  size = 96,
  label = 'Logo',
}: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Sirf image files allowed hain');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image 5MB se kam honi chahiye');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', purpose);

      const res = await apiClient.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.data?.url || res.data?.url;
      if (!url) throw new Error('No URL returned');

      onChange(url);
      toast.success('Logo upload ho gaya ✅');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Upload fail ho gaya');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div
        className="rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center relative"
        style={{ width: size, height: size }}
      >
        {value ? (
          <>
            <img src={value} alt={label} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        ) : (
          <ImageIcon className="h-8 w-8 text-slate-400" />
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        )}
      </div>

      <div className="flex-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {uploading ? 'Uploading...' : value ? 'Change Logo' : 'Upload Logo'}
        </button>
        <p className="text-xs text-slate-500 mt-1.5">
          PNG, JPG, WebP — Max 5MB
        </p>
      </div>
    </div>
  );
}
