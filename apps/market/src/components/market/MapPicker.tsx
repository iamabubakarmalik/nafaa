'use client';
/**
 * Map pin for addresses: Leaflet with OpenStreetMap tiles, loaded only when
 * the address form opens. Dragging the pin or tapping the map reports the
 * point; "Use my location" centres on GPS.
 */
import 'leaflet/dist/leaflet.css';
import { LocateFixed } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';

const PIN_HTML = '<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#9333ea;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.35)"></div>';

export function MapPicker({ value, onChange, gpsLabel, hint }: { value: { lat: number; lng: number } | null; onChange: (p: { lat: number; lng: number }) => void; gpsLabel: string; hint: string }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const pin = useRef<Marker | null>(null);
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    let cancelled = false;
    void import('leaflet').then((L) => {
      if (cancelled || !box.current || map.current) return;
      const start = value ?? { lat: 31.5204, lng: 74.3587 };
      const m = L.map(box.current, { zoomControl: true, attributionControl: true }).setView([start.lat, start.lng], value ? 17 : 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
      const icon = L.divIcon({ html: PIN_HTML, className: '', iconSize: [28, 28], iconAnchor: [14, 28] });
      const mk = L.marker([start.lat, start.lng], { draggable: true, icon }).addTo(m);
      mk.on('dragend', () => {
        const p = mk.getLatLng();
        cb.current({ lat: p.lat, lng: p.lng });
      });
      m.on('click', (e) => {
        mk.setLatLng(e.latlng);
        cb.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
      map.current = m;
      pin.current = mk;
      setTimeout(() => m.invalidateSize(), 200);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // Created once; later moves go through the marker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gps = () =>
    navigator.geolocation?.getCurrentPosition((p) => {
      const pt = { lat: p.coords.latitude, lng: p.coords.longitude };
      map.current?.setView([pt.lat, pt.lng], 17);
      pin.current?.setLatLng([pt.lat, pt.lng]);
      cb.current(pt);
    });

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl ring-1 ring-gray-200">
        <div ref={box} className="h-56 w-full bg-gray-100" />
        <button type="button" onClick={gps} className="absolute bottom-3 end-3 z-[500] inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-bold text-gray-900 shadow-card-lg">
          <LocateFixed className="h-4 w-4 text-brand-600" />
          {gpsLabel}
        </button>
      </div>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
    </div>
  );
}
