/**
 * Restaurant products: the shared products page with the restaurant menu
 * board as its first tab (86 switch, plates left, food cost, menu analytics).
 * Used for /products and /restaurant/menu.
 */

import { ChefHat } from 'lucide-react';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import RestaurantMenuBoard, { MENU_GUIDE } from '../products/RestaurantMenuBoard';

const config: ProductsPageConfig = {
  label: 'Restaurant',
  paths: {
    detail: (id) => `/restaurant-menu-items/${id}`,
    edit: (id) => `/restaurant-menu-items/${id}/edit`,
    create: '/restaurant-menu-items/new',
    bulkImport: '/products/bulk-import',
  },
  filters: ['tags'],
  extraTab: { id: 'menu', label: 'Menu', icon: ChefHat, Component: RestaurantMenuBoard, initial: true, standalone: true },
  guide: MENU_GUIDE,
};

export default function RestaurantProductsListPage() {
  return <ProductsPage config={config} />;
}
