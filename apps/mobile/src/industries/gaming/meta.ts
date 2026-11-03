/** Gaming labels and helpers (mirror of the web gaming lib/meta.ts). Labels are source keys marked with msg(). */

import { useEffect, useState } from 'react';
import { queryClient } from '@/core/query/client';
import { msg, t } from '@/core/i18n';
import { formatDate } from '@/core/format';
import type { StatusTone } from '@/design';

export const GAMING_KEYS = { profiles: 'gaming-profiles', counter: 'gaming-counter', stations: 'gaming-stations', active: 'gaming-active-sessions', rentals: 'gaming-rentals', tournaments: 'gaming-tournaments', topups: 'gaming-topups', dash: 'gaming-dash', sessions: 'gaming-sessions' } as const;

const MONEY_KEYS = ['sales-history', 'customers-directory', 'customer', 'customer-ledger', 'cash-register', 'inv', 'offline'];
export function refreshGaming(money = false) {
  [...Object.values(GAMING_KEYS), ...(money ? MONEY_KEYS : [])].forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

export const STATION_TYPES: Record<string, string> = { PS5_STATION: 'PS5', PS4_STATION: 'PS4', XBOX_STATION: 'Xbox', PC_STATION: 'PC', SIMULATOR: 'Simulator', VR_STATION: 'VR', MULTIPLAYER_BOOTH: msg('Group booth'), PRIVATE_ROOM: msg('Private room'), OTHER: msg('Aur') };
export const stationTypeOptions = () => Object.entries(STATION_TYPES).map(([value, label]) => ({ value, label: t(label) }));
export const PROVIDERS: Record<string, string> = { PUBG_UC: 'PUBG UC', FREE_FIRE_DIAMONDS: 'Free Fire', PSN: 'PSN', STEAM: 'Steam', GOOGLE_PLAY: 'Google Play', XBOX_LIVE: 'Xbox', ROBUX: 'Robux', FORTNITE_VBUCKS: 'V-Bucks', MOBILE_LEGENDS_DIAMONDS: 'ML Diamonds', NINTENDO: 'Nintendo', EPIC_GAMES: 'Epic Games', APPLE_STORE: 'App Store', ITUNES: 'iTunes', DISCORD_NITRO: 'Discord Nitro', NETFLIX: 'Netflix', SPOTIFY: 'Spotify', OTHER: msg('Card') };
export const TIME_SKU = 'GAMING-TIME';
export const TOPUP_SKU = 'TOPUP-';
export const PLATFORMS: Record<string, string> = { PS5: 'PS5', PS4: 'PS4', XBOX_SERIES_X: 'Xbox Series X', XBOX_SERIES_S: 'Xbox Series S', XBOX_ONE: 'Xbox One', NINTENDO_SWITCH: 'Switch', PC: 'PC', STEAM_DECK: 'Steam Deck', MOBILE: 'Mobile', RETRO: 'Retro', MULTI: msg('Sab'), OTHER: msg('Aur') };
export const platformOptions = () => Object.entries(PLATFORMS).map(([value, label]) => ({ value, label: t(label) }));
export const CONDITIONS: Record<string, string> = { NEW_SEALED: msg('Naya sealed'), OPEN_BOX: msg('Open box'), PRE_OWNED: msg('Used'), REFURBISHED: msg('Refurbished'), TRADE_IN: msg('Trade-in') };
export const conditionOptions = () => Object.entries(CONDITIONS).map(([value, label]) => ({ value, label: t(label) }));
export const CATEGORY_TYPES: Array<[string, string]> = [['CONSOLE_PS5', 'PS5'], ['CONSOLE_PS4', 'PS4'], ['CONSOLE_XBOX_SERIES', msg('Xbox Series')], ['CONSOLE_XBOX_ONE', msg('Xbox One')], ['CONSOLE_NINTENDO_SWITCH', 'Switch'], ['CONSOLE_HANDHELD', msg('Handheld')], ['CONSOLE_RETRO', 'Retro'],
  ['GAME_DISC', msg('Game CD')], ['GAME_DIGITAL', msg('Digital game')], ['GAME_COLLECTOR_EDITION', msg('Collector edition')], ['CONTROLLER', msg('Controller')], ['HEADSET_GAMING', msg('Headset')], ['KEYBOARD_GAMING', msg('Keyboard')], ['MOUSE_GAMING', msg('Mouse')],
  ['MOUSEPAD', msg('Mousepad')], ['CHAIR_GAMING', msg('Gaming chair')], ['MONITOR_GAMING', msg('Monitor')], ['PC_PREBUILT', msg('PC (bana hua)')], ['GPU', 'GPU'], ['CPU', 'CPU'], ['RAM', 'RAM'], ['STORAGE_SSD', 'SSD'], ['VR_HEADSET', 'VR'], ['DIGITAL_SUBSCRIPTION', msg('Subscription')], ['GIFT_CARD', msg('Gift card')], ['MERCHANDISE', msg('Merchandise')], ['OTHER', msg('Aur')]];
export const categoryOptions = () => CATEGORY_TYPES.map(([value, label]) => ({ value, label: t(label) }));
export const providerOf = (p?: string | null) => (p ? t(PROVIDERS[p] ?? p.replace(/_/g, ' ')) : '—');
export const providerOptions = () => Object.entries(PROVIDERS).map(([value, label]) => ({ value, label: t(label) }));

export const RENTAL_STATUS: Record<string, { label: string; tone: StatusTone }> = { RESERVED: { label: msg('Reserved'), tone: 'info' }, ACTIVE: { label: msg('Rental par'), tone: 'success' }, RETURNED: { label: msg('Wapas'), tone: 'neutral' }, OVERDUE: { label: msg('Der ho gayi'), tone: 'danger' }, DAMAGED: { label: msg('Kharab'), tone: 'danger' }, LOST: { label: msg('Gum'), tone: 'danger' }, CANCELLED: { label: msg('Cancel'), tone: 'neutral' } };
export const TOURNAMENT_STATUS: Record<string, { label: string; tone: StatusTone }> = { UPCOMING: { label: msg('Aane wala'), tone: 'info' }, REGISTRATION_OPEN: { label: msg('Registration jari'), tone: 'success' }, IN_PROGRESS: { label: msg('Chal raha'), tone: 'warning' }, COMPLETED: { label: msg('Khatam'), tone: 'neutral' }, CANCELLED: { label: msg('Cancel'), tone: 'danger' } };

export const dateOf = (iso?: string | null) => (iso ? formatDate(iso, { year: true }) : '—');
export const minutesText = (m: number) => (m >= 60 ? t('{{h}} ghanta {{m}} min', { h: Math.floor(m / 60), m: m % 60 }) : t('{{m}} min', { m }));

/** A clock that re-renders every second (the station timers). */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), intervalMs); return () => clearInterval(id); }, [intervalMs]);
  return now;
}
