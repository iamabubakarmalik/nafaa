import { Route } from 'react-router-dom';
import { RequireShop } from '@modules/pos/components';
import PermissionRoute from '@app/router/PermissionRoute';
import { permissionForPath } from '@core/lib/route-permissions';
import { IndustryRegistry } from './IndustryRegistry';
import type { IndustryRoute } from '../types/industry-pack';
import type { ReactElement } from 'react';

/**
 * Emits <Route> elements for every route contributed by every registered
 * industry pack.
 *
 * IMPORTANT — how to use inside <Routes>:
 *
 *   <Routes>
 *     ...core routes...
 *     {industryRoutes()}     // spread industry routes here
 *   </Routes>
 *
 * We DO NOT return a wrapping fragment because <Routes> in React Router v6
 * only accepts <Route> children (no wrapper fragments in between).
 */
export function industryRoutes(): ReactElement[] {
  const packs = IndustryRegistry.all();
  const nodes: ReactElement[] = [];

  for (const pack of packs) {
    for (const r of pack.routes) {
      const Component = r.element as any;

      // A counter screen can only sell from one branch. Every pack's POS lives
      // at /pos, so gate it here once instead of in 25 separate pages.
      const needsOneShop = r.path === '/pos' || r.path.startsWith('/pos/');

      /* Pack ke raaste App.tsx se nahi guzarte, is liye ijazat ki
         rok yahan lagti hai. Pehle ye bilkul khule thay: jis cashier
         se maal ka access le liya gaya hota, wo `/bakery/products`
         par ja kar phir bhi sab kuch badal sakta tha. */
      const permission = (r as any).permission ?? permissionForPath(r.path);

      let node: ReactElement = <Component />;
      if (needsOneShop) {
        node = <RequireShop action="POS use karne">{node}</RequireShop>;
      }
      if (permission) {
        node = <PermissionRoute permission={permission}>{node}</PermissionRoute>;
      }

      nodes.push(
        <Route key={`${pack.id}::${r.path}`} path={r.path} element={node} />,
      );
    }
  }

  return nodes;
}

/** Alias for readability at call site */
export function IndustryRoutes(): ReactElement[] {
  return industryRoutes();
}

export type { IndustryRoute };
