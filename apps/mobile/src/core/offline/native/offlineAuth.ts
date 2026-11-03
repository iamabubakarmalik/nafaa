/**
 * Signing in without internet, for people who signed in on this phone
 * before (a cashier coming on shift while the internet is down).
 *
 * After a successful online sign-in the login screen calls
 * rememberOfflineLogin(): a salted SHA-256 of the password (never the
 * password) and the session tokens go to SecureStore (Keychain/Keystore);
 * the user and business records go to the device store. offlineLogin()
 * checks the password against that and restores the session. Expired tokens
 * are refreshed by the API client as soon as there is internet; if the
 * server refuses the refresh, the person signs in again online and their
 * offline work, kept in their own database, is sent then.
 *
 * Up to 8 people are remembered per phone; forgetOfflineLogin() removes one.
 */

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/core/auth/store';
import type { AuthSession, AuthTenant, AuthUser } from '@/core/auth/types';
import { kv } from '@/core/storage/kv';

const INDEX_KEY = 'nafaa.offline-auth.index';
const MAX_PEOPLE = 8;

interface Secret {
  salt: string;
  hash: string;
  accessToken: string;
  refreshToken: string;
}

interface Snapshot {
  email: string;
  user: AuthUser;
  tenant: AuthTenant;
  savedAt: number;
}

const norm = (email: string) => email.trim().toLowerCase();

async function idOf(email: string): Promise<string> {
  const h = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `nafaa-offline-id:${norm(email)}`);
  return h.slice(0, 24);
}

async function hashPassword(salt: string, password: string): Promise<string> {
  // A few rounds so a copied hash is slower to guess; still instant on a phone.
  let h = `${salt}:${password}`;
  for (let i = 0; i < 64; i++) h = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}${h}`);
  return h;
}

const secretKey = (id: string) => `nafaa_offline_${id}`;
const snapshotKey = (id: string) => `nafaa.offline-auth.${id}`;

/** Call after every successful online sign-in with email and password. */
export async function rememberOfflineLogin(email: string, password: string, session: AuthSession): Promise<void> {
  try {
    const id = await idOf(email);
    const salt = Crypto.randomUUID();
    const secret: Secret = { salt, hash: await hashPassword(salt, password), accessToken: session.accessToken, refreshToken: session.refreshToken };
    await SecureStore.setItemAsync(secretKey(id), JSON.stringify(secret));
    kv.set(snapshotKey(id), { email: norm(email), user: session.user, tenant: session.tenant, savedAt: Date.now() } satisfies Snapshot);
    const index = kv.get<string[]>(INDEX_KEY, []).filter((x) => x !== id);
    index.unshift(id);
    for (const old of index.slice(MAX_PEOPLE)) await forgetById(old);
    kv.set(INDEX_KEY, index.slice(0, MAX_PEOPLE));
  } catch {
    // Offline sign-in is a convenience; never block the online sign-in.
  }
}

/** Keeps the saved tokens fresh after a token refresh (optional). */
export async function updateOfflineTokens(email: string, accessToken: string, refreshToken: string): Promise<void> {
  try {
    const id = await idOf(email);
    const raw = await SecureStore.getItemAsync(secretKey(id));
    if (!raw) return;
    const secret = JSON.parse(raw) as Secret;
    await SecureStore.setItemAsync(secretKey(id), JSON.stringify({ ...secret, accessToken, refreshToken }));
  } catch {
    // ignore
  }
}

export async function hasOfflineLogin(email?: string): Promise<boolean> {
  if (!email) return kv.get<string[]>(INDEX_KEY, []).length > 0;
  return !!kv.get<Snapshot | null>(snapshotKey(await idOf(email)), null);
}

/** People who can sign in offline on this phone (for a quick picker). */
export function offlineLoginPeople(): Array<{ email: string; name: string; business: string }> {
  return kv.get<string[]>(INDEX_KEY, [])
    .map((id) => kv.get<Snapshot | null>(snapshotKey(id), null))
    .filter((s): s is Snapshot => !!s)
    .map((s) => ({ email: s.email, name: s.user.fullName, business: s.tenant.name }));
}

/**
 * Signs in from the saved session when the password matches. Returns
 * false for a wrong password or a person never signed in on this phone.
 */
export async function offlineLogin(email: string, password: string): Promise<boolean> {
  const id = await idOf(email);
  const snap = kv.get<Snapshot | null>(snapshotKey(id), null);
  const raw = await SecureStore.getItemAsync(secretKey(id)).catch(() => null);
  if (!snap || !raw) return false;
  const secret = JSON.parse(raw) as Secret;
  if ((await hashPassword(secret.salt, password)) !== secret.hash) return false;
  await useAuthStore.getState().setSession({ user: snap.user, tenant: snap.tenant, accessToken: secret.accessToken, refreshToken: secret.refreshToken });
  return true;
}

async function forgetById(id: string) {
  await SecureStore.deleteItemAsync(secretKey(id)).catch(() => undefined);
  kv.remove(snapshotKey(id));
}

export async function forgetOfflineLogin(email: string): Promise<void> {
  const id = await idOf(email);
  await forgetById(id);
  kv.set(INDEX_KEY, kv.get<string[]>(INDEX_KEY, []).filter((x) => x !== id));
}
