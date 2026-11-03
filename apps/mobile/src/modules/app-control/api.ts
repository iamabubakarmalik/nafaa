/** Network calls of this module. Plain fetch so it does not depend on the app's API client. */

import { appPlatform, appVersion } from './device';
import { setup } from './setup';
import type { AppConfig } from './types';

async function authHeader(): Promise<Record<string, string>> {
  try {
    const token = await setup().getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/** The API wraps every response as { success, data }. */
async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
}

export async function fetchAppConfig(): Promise<AppConfig> {
  const params = new URLSearchParams();
  const platform = appPlatform();
  if (platform) params.set('platform', platform);
  params.set('version', appVersion());
  const res = await fetch(`${setup().apiUrl}/mobile/config?${params.toString()}`, {
    headers: { Accept: 'application/json', ...(await authHeader()) },
  });
  return unwrap<AppConfig>(res);
}

export interface HeartbeatBody {
  installId: string;
  platform: 'ios' | 'android';
  appVersion: string;
  buildNumber?: string;
  runtimeVersion?: string;
  updateId?: string;
  osVersion?: string;
  deviceModel?: string;
  deviceBrand?: string;
  language?: 'en' | 'ur' | 'roman';
  pushToken?: string | null;
}

/** Returns the server's settings version so the caller can refetch the config when it changed. */
export async function sendHeartbeat(body: HeartbeatBody): Promise<{ deviceId: string; configVersion: number } | null> {
  const auth = await authHeader();
  if (!auth.Authorization) return null;
  const res = await fetch(`${setup().apiUrl}/mobile/heartbeat`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(body),
  });
  return unwrap(res);
}
