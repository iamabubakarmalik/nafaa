'use client';

/**
 * "Delivery to <city>": the shopper picks a city once (remembered), and sees
 * the delivery time, charge and whether Cash on Delivery is available there.
 * Rates come from the cart's shipping-rates; before anything is in the cart
 * the shop's default delivery time is shown.
 */
import { Banknote, MapPin, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ShippingRate } from '@/lib/api';
import { sf } from '@/lib/client/sf';
import { useStore } from '../providers/StoreProvider';
import { CitySelect } from '../checkout/CitySelect';

export function DeliveryEta({ price }: { price: number }) {
  const { shop, t, money, cart } = useStore();
  const [city, setCity] = useState<string>('');
  const [rate, setRate] = useState<ShippingRate | null>(null);
  const [none, setNone] = useState(false);

  useEffect(() => {
    try {
      setCity(localStorage.getItem('nf_city') ?? '');
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    if (!city || !cart) {
      setRate(null);
      setNone(false);
      return;
    }
    let live = true;
    sf<{ rates: ShippingRate[] }>('shipping', { city })
      .then((r) => {
        if (!live) return;
        setRate(r.rates[0] ?? null);
        setNone(r.rates.length === 0);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [city, cart]);

  const threshold = shop.shipping.freeShippingThreshold;
  const free = threshold != null && price >= threshold;
  const eta = rate?.eta ?? shop.shipping.defaultEta;
  const cod = rate ? rate.codAvailable : shop.shipping.codAvailable && shop.payments.some((p) => p.code === 'COD');
  return (
    <div className="rounded-card border border-line p-4">
      <div className="flex items-center gap-2 text-[14px]">
        <MapPin size={17} className="shrink-0 text-muted" />
        <span className="text-muted">{t('product.deliveryTo')}</span>
        <div className="min-w-0 flex-1">
          <CitySelect
            value={city}
            compact
            placeholder={t('product.selectCity')}
            onChange={(c) => {
              setCity(c.name);
              try {
                localStorage.setItem('nf_city', c.name);
              } catch {
                /* ignore */
              }
            }}
          />
        </div>
      </div>
      <ul className="mt-3 space-y-2 text-[13.5px]">
        {none ? (
          <li className="text-sale">{t('checkout.notAvailableCity')}</li>
        ) : (
          <>
            {eta && (
              <li className="flex items-center gap-2">
                <Truck size={16} className="text-primary" />
                <span>
                  {t('product.deliveryEta', { eta })}
                  {free ? <b className="ms-1 text-ok">· {t('product.freeDelivery')}</b> : rate && rate.price > 0 ? <span className="text-muted"> · {money(rate.price)}</span> : null}
                </span>
              </li>
            )}
            {!free && threshold ? <li className="ps-6 text-[12.5px] text-muted">{t('cart.freeShippingLeft', { amount: money(threshold - price) })}</li> : null}
            <li className="flex items-center gap-2">
              <Banknote size={16} className={cod ? 'text-primary' : 'text-muted'} />
              <span className={cod ? '' : 'text-muted'}>{cod ? t('product.codAvailable') : t('product.codUnavailable')}</span>
            </li>
          </>
        )}
      </ul>
    </div>
  );
}
