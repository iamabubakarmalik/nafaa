import { useMemo } from 'react';
import {
  Utensils, Bike, ShoppingBag, Car, Home, Package,
  Printer, QrCode, Star,
} from 'lucide-react';
import { formatPKR } from '@/lib/format';
import type { ReceiptConfig } from '../api/receipt-config.api';

interface SaleData {
  saleNumber?: string;
  soldAt?: string;
  customerName?: string;
  customerPhone?: string;
  items: Array<any>;
  subtotal: number;
  discount?: number;
  taxAmount?: number;
  taxPct?: number;
  serviceCharge?: number;
  serviceChargePct?: number;
  deliveryFee?: number;
  packagingFee?: number;
  tip?: number;
  total: number;
  paidAmount?: number;
  changeAmount?: number;
  creditAmount?: number;
  paymentMethod?: string;
  cashierName?: string;

  // Restaurant
  tableNumber?: string;
  tableName?: string;
  orderMode?: string;
  numberOfGuests?: number;
  waiterName?: string;
  kotNumber?: string;

  // Carpet
  cutSqft?: number;
  rollNumber?: string;

  // Mobile
  imeiNumber?: string;
}

interface ShopData {
  name: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
}

interface Props {
  sale: SaleData;
  shop: ShopData;
  config: ReceiptConfig;
  onPrint?: () => void;
}

export function UniversalReceipt({ sale, shop, config, onPrint }: Props) {
  const isRestaurant = config.template === 'RESTAURANT';
  const isCarpet = config.template === 'CARPET';
  const isMobile = config.template === 'MOBILE';

  const widthClass = config.paperWidth === 58 ? 'w-[58mm]' : 'w-[80mm]';
  const fontSizeClass = config.fontSize === 'small' ? 'text-[10px]' : config.fontSize === 'large' ? 'text-[14px]' : 'text-[12px]';

  const modeIcon = useMemo(() => {
    switch (sale.orderMode) {
      case 'DINE_IN': return Utensils;
      case 'TAKEAWAY': return ShoppingBag;
      case 'DELIVERY': return Bike;
      case 'DRIVE_THRU': return Car;
      case 'ROOM_SERVICE': return Home;
      case 'PICKUP': return Package;
      default: return null;
    }
  }, [sale.orderMode]);

  return (
    <div className={'bg-white text-black mx-auto p-3 ' + widthClass + ' ' + fontSizeClass + ' font-mono shadow-lg print:shadow-none'} style={{ fontFamily: 'monospace' }}>
      {/* ─── HEADER ─── */}
      {config.showLogo && shop.logoUrl && (
        <div className="text-center mb-2">
          <img src={shop.logoUrl} alt="" className="h-16 w-auto mx-auto" />
        </div>
      )}

      {config.showShopName && (
        <div className="text-center font-extrabold text-base uppercase">{shop.name}</div>
      )}

      {config.showShopAddress && shop.address && (
        <div className="text-center text-[10px] mt-0.5">{shop.address}</div>
      )}

      {config.showShopPhone && shop.phone && (
        <div className="text-center text-[10px]">Tel: {shop.phone}</div>
      )}

      {/* ─── RESTAURANT SPECIFIC HEADER ─── */}
      {isRestaurant && (
        <div className="mt-2 border-t border-b border-black border-dashed py-1.5 text-center">
          {config.showTableNumber && sale.tableNumber && (
            <div className="font-extrabold text-base">
              Table: {sale.tableNumber}
              {sale.tableName && ' — ' + sale.tableName}
            </div>
          )}
          {config.showOrderMode && sale.orderMode && modeIcon && (
            <div className="font-bold uppercase">
              {sale.orderMode.replace('_', ' ')}
              {sale.numberOfGuests && ' • ' + sale.numberOfGuests + ' guests'}
            </div>
          )}
          {config.showWaiterName && sale.waiterName && (
            <div className="text-[10px]">Server: {sale.waiterName}</div>
          )}
          {config.showKot && sale.kotNumber && (
            <div className="text-[10px] font-bold">KOT: {sale.kotNumber}</div>
          )}
        </div>
      )}

      {/* ─── RECEIPT INFO ─── */}
      <div className="mt-2 flex justify-between text-[10px]">
        <span>{sale.saleNumber || 'Receipt'}</span>
        <span>{sale.soldAt ? new Date(sale.soldAt).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}</span>
      </div>

      {config.showCustomer && (sale.customerName || sale.customerPhone) && (
        <div className="text-[10px] mt-0.5">
          Customer: {sale.customerName || 'Walk-in'}
          {sale.customerPhone && ' • ' + sale.customerPhone}
        </div>
      )}

      {sale.cashierName && (
        <div className="text-[10px]">Cashier: {sale.cashierName}</div>
      )}

      {/* ─── DIVIDER ─── */}
      <div className="border-t border-black border-dashed my-1.5"></div>

      {/* ─── ITEMS ─── */}
      <div className="space-y-1">
        {sale.items.map((item, i) => (
          <div key={i} className="space-y-0.5">
            {/* Main line */}
            <div className="flex justify-between">
              <span className="font-bold">
                {item.quantity}× {item.name || item.product?.name}
              </span>
              <span className="tabular-nums">
                {formatPKR(item.total ?? (item.priceOverride ?? item.basePrice) * item.quantity)}
              </span>
            </div>

            {/* ─── RESTAURANT: Modifiers ─── */}
            {isRestaurant && config.showModifiers && item.modifiers?.length > 0 && (
              <div className="pl-3 text-[10px]">
                {item.modifiers.map((mod: any, mi: number) => (
                  <div key={mi} className="flex justify-between">
                    <span className="italic">
                      {mod.modifierOption?.name || mod.optionName}
                      {mod.quantity > 1 && ' ×' + mod.quantity}
                    </span>
                    {mod.priceAdjustment !== 0 && (
                      <span className="tabular-nums">
                        {mod.priceAdjustment > 0 ? '+' : ''}{formatPKR(mod.priceAdjustment)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ─── RESTAURANT: Special Instructions ─── */}
            {isRestaurant && config.showSpecialInstructions && item.specialInstructions && (
              <div className="pl-3 text-[10px] italic text-slate-600">
                📝 {item.specialInstructions}
              </div>
            )}

            {/* ─── CARPET: Dimensions ─── */}
            {isCarpet && config.showDimensions && (item.cutWidthFt || item.cutLengthFt) && (
              <div className="pl-3 text-[10px]">
                <div>Size: {item.cutWidthFt}ft × {item.cutLengthFt}ft</div>
                {config.showSqft && item.cutSqft && (
                  <div>Area: {item.cutSqft.toFixed(2)} sqft @ {formatPKR(item.basePrice)}/sqft</div>
                )}
                {config.showRollNumber && item.rollNumber && (
                  <div>From Roll: {item.rollNumber}</div>
                )}
              </div>
            )}

            {/* ─── MOBILE: IMEI ─── */}
            {isMobile && config.showImei && item.imeiNumber && (
              <div className="pl-3 text-[10px]">
                <div>IMEI: {item.imeiNumber}</div>
                {config.showWarranty && (
                  <div>Warranty: See terms</div>
                )}
              </div>
            )}

            {/* ─── RETAIL: Unit info ─── */}
            {!isRestaurant && !isCarpet && !isMobile && config.showUnit && item.unit && item.unit !== 'piece' && (
              <div className="pl-3 text-[10px]">
                Unit: {item.unit}
              </div>
            )}

            {/* Note */}
            {item.note && !item.specialInstructions && (
              <div className="pl-3 text-[10px] italic text-slate-600">
                {item.note}
              </div>
            )}

            {/* Line discount */}
            {item.lineDiscount > 0 && (
              <div className="pl-3 text-[10px] text-rose-700">
                Discount: -{formatPKR(item.lineDiscount)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ─── DIVIDER ─── */}
      <div className="border-t border-black border-dashed my-1.5"></div>

      {/* ─── TOTALS ─── */}
      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatPKR(sale.subtotal)}</span>
        </div>

        {/* ─── RESTAURANT: Service Charge ─── */}
        {isRestaurant && config.showServiceCharge && sale.serviceCharge && sale.serviceCharge > 0 && (
          <div className="flex justify-between">
            <span>Service ({sale.serviceChargePct || 0}%)</span>
            <span className="tabular-nums">{formatPKR(sale.serviceCharge)}</span>
          </div>
        )}

        {/* ─── Tax ─── */}
        {config.showTaxBreakdown !== false && sale.taxAmount && sale.taxAmount > 0 && (
          <div className="flex justify-between">
            <span>Tax ({sale.taxPct || 0}%)</span>
            <span className="tabular-nums">{formatPKR(sale.taxAmount)}</span>
          </div>
        )}

        {/* ─── Delivery fee ─── */}
        {sale.deliveryFee && sale.deliveryFee > 0 && (
          <div className="flex justify-between">
            <span>Delivery</span>
            <span className="tabular-nums">{formatPKR(sale.deliveryFee)}</span>
          </div>
        )}

        {/* ─── Packaging ─── */}
        {sale.packagingFee && sale.packagingFee > 0 && (
          <div className="flex justify-between">
            <span>Packaging</span>
            <span className="tabular-nums">{formatPKR(sale.packagingFee)}</span>
          </div>
        )}

        {/* ─── Discount ─── */}
        {sale.discount && sale.discount > 0 && (
          <div className="flex justify-between text-rose-700">
            <span>Discount</span>
            <span className="tabular-nums">-{formatPKR(sale.discount)}</span>
          </div>
        )}

        {/* ─── Tip (restaurant) ─── */}
        {isRestaurant && config.showTip && sale.tip && sale.tip > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Tip</span>
            <span className="tabular-nums">{formatPKR(sale.tip)}</span>
          </div>
        )}

        {/* ─── TOTAL ─── */}
        <div className="border-t border-black border-double my-1 pt-1 flex justify-between font-extrabold text-base">
          <span>TOTAL</span>
          <span className="tabular-nums">{formatPKR(sale.total)}</span>
        </div>

        {/* ─── Payment ─── */}
        {sale.paymentMethod && (
          <div className="flex justify-between text-[10px]">
            <span>Payment: {sale.paymentMethod}</span>
          </div>
        )}
        {sale.paidAmount !== undefined && sale.paidAmount > 0 && (
          <div className="flex justify-between text-[10px]">
            <span>Paid</span>
            <span className="tabular-nums">{formatPKR(sale.paidAmount)}</span>
          </div>
        )}
        {sale.changeAmount && sale.changeAmount > 0 && (
          <div className="flex justify-between text-[10px]">
            <span>Change</span>
            <span className="tabular-nums">{formatPKR(sale.changeAmount)}</span>
          </div>
        )}
        {sale.creditAmount && sale.creditAmount > 0 && (
          <div className="flex justify-between text-[10px] text-rose-700">
            <span>Credit (Udhaar)</span>
            <span className="tabular-nums">{formatPKR(sale.creditAmount)}</span>
          </div>
        )}
      </div>

      {/* ─── FOOTER ─── */}
      {config.showFooter && (
        <div className="mt-2 text-center border-t border-black border-dashed pt-1.5">
          <div className="font-bold">{config.footerText || 'Thank you!'}</div>
          {config.showQRCode && (
            <div className="mt-1 flex justify-center">
              <QrCode className="h-12 w-12 text-black" />
            </div>
          )}
          <div className="text-[8px] mt-1 text-slate-600">
            Powered by Nafaa POS
          </div>
        </div>
      )}

      {/* ─── Print Button (screen only) ─── */}
      {onPrint && (
        <button
          onClick={onPrint}
          className="mt-3 w-full h-10 rounded-lg bg-slate-900 text-white font-extrabold flex items-center justify-center gap-2 print:hidden"
        >
          <Printer className="h-4 w-4" />
          Print Receipt
        </button>
      )}

      {/* ─── Kitchen Copy (Restaurant only, copies = 2) ─── */}
      {isRestaurant && config.copies === 2 && config.showKot && (
        <>
          <div className="border-t-4 border-black border-double my-3"></div>
          <div className="text-center font-extrabold uppercase text-sm">
            ━━ KITCHEN COPY ━━
          </div>
          <div className="text-center text-[10px] mt-0.5">
            {sale.saleNumber} • {new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
          </div>
          {sale.tableNumber && (
            <div className="text-center font-extrabold text-base mt-1">
              Table: {sale.tableNumber}
            </div>
          )}
          <div className="border-t border-black border-dashed my-1"></div>
          <div className="space-y-1">
            {sale.items.map((item, i) => (
              <div key={i} className="flex justify-between font-bold">
                <span>{item.quantity}× {item.name || item.product?.name}</span>
              </div>
            ))}
            {sale.items.some((item: any) => item.specialInstructions) && (
              <div className="border-t border-black border-dotted my-1 pt-1">
                {sale.items.filter((item: any) => item.specialInstructions).map((item: any, i: number) => (
                  <div key={i} className="text-[10px] italic">
                    {item.name}: {item.specialInstructions}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
