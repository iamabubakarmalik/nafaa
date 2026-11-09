/**
 * Extension points of the online store screens. Later features (live parcel
 * map, courier scorecard, automation) register a home section, an order
 * card or a menu link here instead of editing the screens.
 */

import type { ComponentType } from 'react';
import type { BoardOrderDetail } from '../api/board';
import type { OnlineLink } from './nav';

export interface HomeSection { key: string; order: number; Component: ComponentType }
export interface OrderCard { key: string; order: number; Component: ComponentType<{ order: BoardOrderDetail; canManage: boolean; onChanged: () => void }> }

const homeSections: HomeSection[] = [];
const orderCards: OrderCard[] = [];
const extraLinks: Array<OnlineLink & { group: string }> = [];

const add = <T extends { key: string; order?: number }>(list: T[], item: T) => {
  const i = list.findIndex((x) => x.key === item.key);
  if (i >= 0) list[i] = item; else list.push(item);
  list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};

export const registerHomeSection = (s: HomeSection) => add(homeSections, s);
export const registerOrderCard = (c: OrderCard) => add(orderCards, c);
/** A screen in the online store menu; `group` is a COMMERCE_GROUPS id. */
export const registerOnlineLink = (l: OnlineLink & { group: string }) => add(extraLinks as Array<OnlineLink & { group: string; key: string }>, { ...l, key: l.href });

export const getHomeSections = () => homeSections;
export const getOrderCards = () => orderCards;
export const getExtraLinks = () => extraLinks;
