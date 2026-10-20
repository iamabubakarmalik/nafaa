/**
 * Furniture counter: the shared POS with the furniture config, then — for a
 * bill with furniture on it — an offer to book its delivery (the Deliveries
 * page opens with the bill filled in).
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { PosScreen, type PosSavedSale } from '@modules/pos/engine';
import { furniturePos, furnitureSaleListener } from '../pos/config';

export default function FurniturePosPage() {
  const navigate = useNavigate();
  const canBook = usePermission(PERMISSIONS.SERVICE_JOBS_MANAGE);
  const [sale, setSale] = useState<PosSavedSale | null>(null);
  useEffect(() => {
    if (!canBook) return undefined;
    const listener = (s: PosSavedSale) => setSale(s);
    furnitureSaleListener.current = listener;
    return () => { if (furnitureSaleListener.current === listener) furnitureSaleListener.current = null; };
  }, [canBook]);

  return (
    <>
      <PosScreen config={furniturePos} />
      {sale && (
        <Modal open size="sm" onClose={() => setSale(null)} title="Delivery chahiye?" description={`Bill ${sale.saleNumber}${sale.customer ? ` · ${sale.customer.name}` : ''}`}
          footer={<>
            <Button variant="secondary" onClick={() => setSale(null)}>Nahi, customer le gaya</Button>
            <Button onClick={() => { const id = sale.id; setSale(null); navigate(`/furniture/deliveries?saleId=${id}`); }}><Truck className="h-4 w-4" />Delivery banayein</Button>
          </>}>
          <p className="text-[0.875rem] text-slate-700">Pata, date, gaari aur fitting ke charges likhein. Charges ka bill delivery par alag banta hai.</p>
        </Modal>
      )}
    </>
  );
}
