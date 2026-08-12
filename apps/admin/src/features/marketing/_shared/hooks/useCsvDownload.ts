import { apiClient } from '../../../../api/client';
import { toast } from 'sonner';

export function useCsvDownload() {
  return async (url: string, filename: string) => {
    try {
      const res = await apiClient.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
      toast.success('CSV download shuru ho gaya');
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Download fail ho gaya');
    }
  };
}
