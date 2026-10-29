/**
 * Phone services for the booker: the HTTP transport over the shared api
 * client, GPS (expo-location, loaded lazily for older app binaries) and ids.
 */

import { Linking } from 'react-native';
import * as Crypto from 'expo-crypto';
import { apiClient } from '@/api/client';
import { HttpError, type Http } from '../core/api';

function toHttpError(e: unknown): HttpError {
  const err = e as { response?: { status?: number; data?: { message?: string | string[] } }; message?: string };
  if (!err?.response) return new HttpError(0, 'Internet nahi hai');
  const m = err.response.data?.message;
  return new HttpError(err.response.status ?? 500, Array.isArray(m) ? m.join(', ') : m || err.message || 'Kuch ghalat ho gaya');
}

export const http: Http = {
  async get<T>(path: string, params?: Record<string, string | number | undefined>) {
    try {
      const res = await apiClient.get<T>(path, { params, timeout: 60000 });
      return res.data;
    } catch (e) {
      throw toHttpError(e);
    }
  },
  async post<T>(path: string, body: unknown) {
    try {
      const res = await apiClient.post<T>(path, body, { timeout: 90000 });
      return res.data;
    } catch (e) {
      throw toHttpError(e);
    }
  },
};

export const newClientRef = () => Crypto.randomUUID();

export interface Gps {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export type GpsResult = { ok: true; gps: Gps } | { ok: false; reason: 'denied' | 'off' | 'failed' | 'unavailable' };

/** Current position, or the reason there is none. Never throws. */
export async function currentGps(timeoutMs = 15000): Promise<GpsResult> {
  let Location: typeof import('expo-location');
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Location = require('expo-location');
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return { ok: false, reason: 'denied' };
    if (!(await Location.hasServicesEnabledAsync())) return { ok: false, reason: 'off' };
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    const fix = pos ?? (await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 }));
    if (!fix) return { ok: false, reason: 'failed' };
    return { ok: true, gps: { latitude: fix.coords.latitude, longitude: fix.coords.longitude, accuracy: fix.coords.accuracy ?? null } };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

export const GPS_REASON: Record<Exclude<GpsResult, { ok: true }>['reason'], string> = {
  denied: 'Location ki permission nahi di — Settings me allow karein',
  off: 'Phone ki location band hai — on karein',
  failed: 'Location nahi mili — khuli jagah par dobara try karein',
  unavailable: 'Location ke liye app update karein',
};

/** Pakistani number to WhatsApp's international form (923001234567). */
export function waNumber(phone: string | null | undefined): string {
  const d = (phone ?? '').replace(/\D/g, '');
  if (d.startsWith('92')) return d;
  if (d.startsWith('03')) return `92${d.slice(1)}`;
  if (d.startsWith('3') && d.length === 10) return `92${d}`;
  return d;
}

export async function openWhatsApp(text: string, phone?: string | null) {
  const n = waNumber(phone);
  await Linking.openURL(`https://wa.me/${n}?text=${encodeURIComponent(text)}`);
}

export async function openMap(lat: number, lng: number) {
  await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
}
