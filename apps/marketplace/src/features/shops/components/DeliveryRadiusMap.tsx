import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Bike, MapPin } from 'lucide-react';
import { Card } from '@/ui';
import { formatDistance } from '@/lib/format';

const shopIcon = new L.DivIcon({
  html: `<div class="h-10 w-10 rounded-full bg-gradient-to-br from-brand-500 to-emerald-600 shadow-brand flex items-center justify-center border-2 border-white">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><line x1="2" x2="22" y1="7" y2="7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/></svg>
  </div>`,
  className: 'shop-marker',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

interface Props {
  lat: number;
  lng: number;
  radiusKm: number;
  shopName: string;
  yourLat?: number;
  yourLng?: number;
  yourDistanceKm?: number;
}

export function DeliveryRadiusMap({ lat, lng, radiusKm, shopName, yourLat, yourLng, yourDistanceKm }: Props) {
  const inRadius = yourDistanceKm != null && yourDistanceKm <= radiusKm;

  return (
    <Card className="overflow-hidden">
      <div className="p-3 border-b border-border bg-brand-50 dark:bg-brand-950/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bike className="h-4 w-4 text-brand-600" />
          <div>
            <div className="text-xs font-black">Delivery area</div>
            <div className="text-2xs text-content-muted">
              Delivers within {radiusKm} km
            </div>
          </div>
        </div>
        {yourDistanceKm != null && (
          <div className={`text-right px-3 py-1 rounded-full text-2xs font-black ${
            inRadius ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400' : 'bg-danger/10 text-danger'
          }`}>
            {inRadius ? `✓ You're in range` : `⚠️ Out of range`}
          </div>
        )}
      </div>

      <div className="h-64 relative">
        <MapContainer
          center={[lat, lng]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Circle
            center={[lat, lng]}
            radius={radiusKm * 1000}
            pathOptions={{
              color: '#10b981',
              fillColor: '#10b981',
              fillOpacity: 0.15,
              weight: 2,
            }}
          />
          <Marker position={[lat, lng]} icon={shopIcon} />
        </MapContainer>
      </div>

      {yourDistanceKm != null && (
        <div className="p-3 flex items-center justify-between text-xs">
          <span className="text-content-muted flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            Your distance to {shopName}
          </span>
          <span className="font-black">{formatDistance(yourDistanceKm)}</span>
        </div>
      )}
    </Card>
  );
}
