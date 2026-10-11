/** Retail products: the shared page plus the ready-made catalogue (Quick Setup). */

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { heroButton } from '@/design-system/components';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import { QuickSetupCatalogModal } from '@modules/inventory/products/components/QuickSetupCatalogModal';

function QuickSetup() {
  const [open, setOpen] = useState(false);
  if (!usePermission(PERMISSIONS.PRODUCTS_CREATE)) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="2000+ tayyar cheezon mein se chunein"
        className={heroButton}>
        <Sparkles className="h-4 w-4" /><span className="hidden sm:inline">Quick Setup</span>
      </button>
      {open && <QuickSetupCatalogModal onClose={() => setOpen(false)} />}
    </>
  );
}

const config: ProductsPageConfig = {
  label: 'Retail',
  paths: {
    detail: (id) => `/retail-products/${id}`,
    edit: (id) => `/retail-products/${id}/edit`,
    create: '/retail-products/new',
    bulkImport: '/retail/bulk-import',
  },
  HeroExtra: QuickSetup,
  filters: ['tags'],
  guide: [{ icon: Sparkles, color: '#ea580c', title: 'Quick Setup', text: '2000+ aam cheezein (atta, cheeni, sabun…) tayyar hain — chunein aur rate daal dein.' }],
};

export default function RetailProducts() {
  return <ProductsPage config={config} />;
}
