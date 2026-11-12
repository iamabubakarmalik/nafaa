import { money, percentOff } from '@/lib/format';

/** Price with compare-at and a "% off" chip. Works on server and client. */
export function Price({
  price,
  compareAt,
  priceMax,
  symbol = 'Rs',
  size = 'md',
  fromLabel,
  className = '',
}: {
  price: number;
  compareAt?: number | null;
  priceMax?: number | null;
  symbol?: string;
  size?: 'sm' | 'md' | 'lg';
  fromLabel?: (price: string) => string;
  className?: string;
}) {
  const off = percentOff(price, compareAt);
  const main = priceMax && priceMax > price && fromLabel ? fromLabel(money(price, symbol)) : money(price, symbol);
  const cls = size === 'lg' ? 'text-2xl md:text-[1.75rem] font-semibold' : size === 'sm' ? 'text-[14px] font-semibold' : 'text-[15px] font-semibold';
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 gap-y-1 ${className}`}>
      <span className={`${cls} ${off ? 'text-sale' : 'text-fg'} tabular-nums`}>{main}</span>
      {off > 0 && (
        <>
          <s className={`${size === 'lg' ? 'text-base' : 'text-[13px]'} text-muted tabular-nums`}>{money(compareAt, symbol)}</s>
          {size === 'lg' && <span className="badge bg-sale text-white">-{off}%</span>}
        </>
      )}
    </span>
  );
}
