/**
 * Phone location for a visit. Watches GPS for up to 25 seconds and keeps the
 * most accurate fix, stopping early once it is within 25 m.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type GeoState =
  | { status: 'idle' | 'loading' }
  | { status: 'ok'; lat: number; lng: number; accuracy: number; refining: boolean }
  | { status: 'error'; message: string };

const GOOD_ENOUGH_M = 25;
const MAX_WAIT_MS = 25_000;

function messageFor(err: GeolocationPositionError) {
  if (err.code === err.PERMISSION_DENIED) return 'Location ki ijazat nahi mili. Browser settings me is site ko Location allow karein.';
  if (err.code === err.TIMEOUT) return 'Location nahi mil saki. Khuli jagah par ja kar dobara koshish karein.';
  return 'Location nahi mil saki. Phone ka GPS (Location) on karein.';
}

export function useGeo() {
  const [state, setState] = useState<GeoState>({ status: 'idle' });
  const watch = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (watch.current != null) navigator.geolocation.clearWatch(watch.current);
    if (timer.current) clearTimeout(timer.current);
    watch.current = null;
    timer.current = null;
    setState((s) => (s.status === 'ok' ? { ...s, refining: false } : s.status === 'loading' ? { status: 'error', message: 'Location nahi mil saki. Khuli jagah par ja kar dobara koshish karein.' } : s));
  }, []);

  const start = useCallback(() => {
    if (!('geolocation' in navigator)) { setState({ status: 'error', message: 'Is phone/browser me location ki suhoolat nahi.' }); return; }
    stop();
    setState({ status: 'loading' });
    watch.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setState((s) => {
          if (s.status === 'ok' && s.accuracy <= accuracy) return s;
          return { status: 'ok', lat: latitude, lng: longitude, accuracy: Math.round(accuracy), refining: true };
        });
        if (accuracy <= GOOD_ENOUGH_M) stop();
      },
      (err) => {
        setState((s) => (s.status === 'ok' ? s : { status: 'error', message: messageFor(err) }));
        if (err.code === err.PERMISSION_DENIED) stop();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: MAX_WAIT_MS },
    );
    timer.current = setTimeout(stop, MAX_WAIT_MS);
  }, [stop]);

  useEffect(() => () => {
    if (watch.current != null) navigator.geolocation.clearWatch(watch.current);
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { state, start };
}
