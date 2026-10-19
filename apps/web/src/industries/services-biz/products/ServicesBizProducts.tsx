/**
 * Service-business products on the shared products page: parts and
 * materials kept on the shelf (they leave stock when a job is billed or
 * sold at the counter) next to the rate-list services, which carry no
 * stock and are changed from the Service Catalog.
 */

import { Link } from 'react-router-dom';
import { Briefcase, Package, Tag, Wrench } from 'lucide-react';
import { heroButton } from '@/design-system/components';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';

const isService = (sku?: string | null, unit?: string | null) => String(sku ?? '').startsWith('SVCB-') || String(unit ?? '').toLowerCase() === 'service';

function HeroLinks() {
  return (
    <>
      <Link to="/services-biz/catalog" className={heroButton}><Tag className="h-4 w-4" /><span className="hidden sm:inline">Rate list</span></Link>
      <Link to="/services-biz/jobs" className={heroButton}><Briefcase className="h-4 w-4" /><span className="hidden sm:inline">Jobs</span></Link>
    </>
  );
}

const config: ProductsPageConfig = {
  label: 'Parts aur saman',
  noun: 'part',
  paths: {
    detail: (id) => `/products/${id}`,
    edit: (id) => `/products/${id}/edit`,
    create: '/products/new',
    bulkImport: '/products/bulk-import',
  },
  HeroExtra: HeroLinks,
  filters: ['tags'],
  stockChips: () => [1, 5, 10, 25, 50],
  extras: (item) => (isService(item.sku, item.unit)
    ? {
      badges: <span className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-1.5 py-0.5 text-[0.625rem] font-bold text-white"><Wrench className="h-3 w-3" />Service</span>,
      line: 'Rate list ki service — stock nahi, rate Service Catalog se',
    }
    : {}),
  guide: [
    { icon: Package, color: '#2563eb', title: 'Parts aur saman', text: 'Capacitor, gas, pipe, wire — jo dukaan me rakhte hain. Job par jorne se bill banne par stock se nikalta hai.' },
    { icon: Wrench, color: '#0284c7', title: 'Services', text: 'Neele "Service" nishan wali cheezein rate list se aati hain — un ka rate Service Catalog me badlein.' },
  ],
};

export default function ServicesBizProducts() {
  return <ProductsPage config={config} />;
}
