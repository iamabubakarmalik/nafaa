import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Bike, Store, MapPin, Navigation, Loader2 } from 'lucide-react';
import { useJoinRoom, useSocketEvent } from '@/lib/useSocket';
import { Card } from '@/ui';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const riderIcon = new L.DivIcon({
  html: `<div class="h-10 w-10 rounded-full bg-gradient-to-br from-brand-500 to-emerald-600 shadow-brand flex items-center justify-center border-2 border-white animate-pulse-soft">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
  </div>`,
  className: 'rider-marker',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const shopIcon = new L.DivIcon({
  html: `<div class="h-10 w-10 rounded-full bg-gradient-to-br from-accent-500 to-orange-600 shadow-accent flex items-center justify-center border-2 border-white">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><line x1="2" x2="22" y1="7" y2="7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/></svg>
  </div>`,
  className: 'shop-marker',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const destinationIcon = new L.DivIcon({
  html: `<div class="h-10 w-10 rounded-full bg-gradient-to-br from-danger to-red-700 shadow-lg flex items-center justify-center border-2 border-white">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
  </div>`,
  className: 'destination-marker',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [points, map]);
  return null;
}

interface Props {
  orderId: string;
  shopLat?: number | null;
  shopLng?: number | null;
  shopName?: string;
  destLat?: number | null;
  destLng?: number | null;
  destAddress?: string;
  initialRiderLat?: number | null;
  initialRiderLng?: number | null;
  riderName?: string;
  status: string;
}

export function RiderTrackingMap({
  orderId,
  shopLat, shopLng, shopName,
  destLat, destLng, destAddress,
  initialRiderLat, initialRiderLng, riderName,
  status,
}: Props) {
  const [riderPos, setRiderPos] = useState<[number, number] | null>(
    initialRiderLat && initialRiderLng ? [initialRiderLat, initialRiderLng] : null,
  );
  const [distance, setDistance] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useJoinRoom('order', orderId);

  useSocketEvent('rider:location', (data: { lat: number; lng: number }) => {
    setRiderPos([data.lat, data.lng]);
    setLastUpdate(new Date());
  });

  useEffect(() => {
    if (riderPos && destLat && destLng) {
      const R = 6371;
      const dLat = ((destLat - riderPos[0]) * Math.PI) / 180;
      const dLng = ((destLng - riderPos[1]) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((riderPos[0] * Math.PI) / 180) * Math.cos((destLat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
      setDistance(2 * R * Math.asin(Math.sqrt(a)));
    }
  }, [riderPos, destLat, destLng]);

  const hasShop = shopLat != null && shopLng != null;
  const hasDest = destLat != null && destLng != null;
  const hasRider = riderPos !== null;

  if (!hasShop && !hasDest && !hasRider) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600 mx-auto mb-2" />
        <p className="text-sm text-content-muted">Waiting for rider location...</p>
      </Card>
    );
  }

  const center: [number, number] = hasRider ? riderPos!
    : hasShop ? [shopLat!, shopLng!]
    : [destLat!, destLng!];

  const pathPoints: [number, number][] = [];
  if (hasShop) pathPoints.push([shopLat!, shopLng!]);
  if (hasRider) pathPoints.push(riderPos!);
  if (hasDest) pathPoints.push([destLat!, destLng!]);

  const eta = distance ? Math.max(1, Math.ceil(distance * 3)) : null;

  return (
    <Card className="overflow-hidden">
      {/* Info bar */}
      <div className="p-3 border-b border-border bg-brand-50 dark:bg-brand-950/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-full bg-brand-600 flex items-center justify-center shrink-0 animate-pulse-soft">
            <Bike className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-content truncate">
              {riderName || 'Your rider'}
            </div>
            <div className="text-2xs text-content-muted">
              {status === 'OUT_FOR_DELIVERY' ? 'On the way' : 'Preparing'}
              {lastUpdate && ` · Updated ${new Date().getSeconds() - lastUpdate.getSeconds()}s ago`}
            </div>
          </div>
        </div>
        {eta && (
          <div className="text-right shrink-0">
            <div className="text-lg font-black text-brand-600 dark:text-brand-400 tabular-nums">
              {eta}m
            </div>
            <div className="text-2xs text-content-muted font-bold">ETA</div>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="h-72 md:h-96 relative">
        <MapContainer
          center={center}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBounds points={pathPoints} />

          {/* Shop marker */}
          {hasShop && (
            <Marker position={[shopLat!, shopLng!]} icon={shopIcon}>
              <Popup>
                <strong>🏪 {shopName || 'Shop'}</strong>
                <br />Pickup location
              </Popup>
            </Marker>
          )}

          {/* Rider marker */}
          {hasRider && (
            <Marker position={riderPos!} icon={riderIcon}>
              <Popup>
                <strong>🛵 {riderName || 'Rider'}</strong>
                <br />On the move
              </Popup>
            </Marker>
          )}

          {/* Destination marker */}
          {hasDest && (
            <Marker position={[destLat!, destLng!]} icon={destinationIcon}>
              <Popup>
                <strong>📍 Delivery address</strong>
                <br />{destAddress || 'Your location'}
              </Popup>
            </Marker>
          )}

          {/* Route line */}
          {pathPoints.length >= 2 && (
            <Polyline
              positions={pathPoints}
              pathOptions={{
                color: '#10b981',
                weight: 4,
                opacity: 0.7,
                dashArray: '10, 10',
              }}
            />
          )}
        </MapContainer>

        {/* Distance overlay */}
        {distance && (
          <div className="absolute bottom-4 left-4 glass rounded-2xl px-3 py-2 shadow-lg">
            <div className="text-2xs font-bold text-content-muted">Distance remaining</div>
            <div className="text-lg font-black text-content flex items-center gap-1">
              <Navigation className="h-4 w-4 text-brand-600" />
              {distance.toFixed(1)} km
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
