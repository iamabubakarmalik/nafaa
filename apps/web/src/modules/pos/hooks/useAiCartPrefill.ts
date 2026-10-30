/**
 * Opens the POS with a bill Nafaa AI prepared ("POS me kholein"). The cart
 * arrives as router state `{ aiCart: [{ productId, qty }] }`; once the
 * catalogue has loaded, each line is added through the engine's normal
 * addItem (so prices, stock checks and industry rules apply as usual) and
 * the state is cleared so a refresh does not add it twice.
 */

import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { PosEngine } from '../engine/usePosEngine';
import { t } from '@core/i18n';

interface AiCartLine { productId: string; qty: number }

export function useAiCartPrefill(e: Pick<PosEngine, 'items' | 'loading' | 'addItem'>) {
  const location = useLocation();
  const navigate = useNavigate();
  const done = useRef(false);
  const cart = (location.state as { aiCart?: AiCartLine[] } | null)?.aiCart;

  useEffect(() => {
    if (done.current || !Array.isArray(cart) || !cart.length || e.loading || !e.items.length) return;
    done.current = true;
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    const byId = new Map(e.items.map((it) => [it.id, it]));
    let added = 0;
    for (const line of cart) {
      const it = byId.get(line.productId);
      if (!it) continue;
      e.addItem(it, { qty: line.qty > 0 ? line.qty : 1 });
      added++;
    }
    const missing = cart.length - added;
    if (missing) toast.info(t('{{added}} cheezein bill me — {{missing}} counter par nahi milin, khud jorein', { added, missing }));
    else toast.success(t('Nafaa AI ka bill POS me khul gaya'));
  }, [cart, e.loading, e.items]); // eslint-disable-line react-hooks/exhaustive-deps
}
