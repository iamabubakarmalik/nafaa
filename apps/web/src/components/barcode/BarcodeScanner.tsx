import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>('');

  useEffect(() => {
    BrowserMultiFormatReader.listVideoInputDevices()
      .then((d) => {
        setDevices(d);
        if (d.length > 0) setDeviceId(d[0].deviceId);
      })
      .catch(() => setError('Camera access denied'));
  }, []);

  useEffect(() => {
    if (!deviceId || !videoRef.current) return;

    const reader = new BrowserMultiFormatReader();
    let active = true;

    reader
      .decodeFromVideoDevice(deviceId, videoRef.current, (result) => {
        if (result && active) {
          active = false;
          onDetected(result.getText());
        }
      })
      .catch((err) => setError(err.message));

    return () => {
      active = false;
      // @ts-ignore
      reader.reset?.();
    };
  }, [deviceId, onDetected]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Barcode Scanner</h3>
              <p className="text-xs text-slate-500">Camera ke samne barcode rakhein</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-slate-950 relative">
          {error ? (
            <div className="p-12 text-center text-white">
              <p className="text-red-400">{error}</p>
              <p className="text-sm text-slate-400 mt-2">USB scanner use karein ya manual entry karein</p>
            </div>
          ) : (
            <>
              <video ref={videoRef} className="w-full h-[360px] object-cover" />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-3/4 h-32 border-4 border-brand-500 rounded-2xl shadow-2xl" />
              </div>
            </>
          )}
        </div>

        {devices.length > 1 && (
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50">
            <select
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm"
            >
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
