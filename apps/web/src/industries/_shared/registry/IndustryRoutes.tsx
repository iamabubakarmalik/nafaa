import { Route } from 'react-router-dom';
import { RequireShop } from '@modules/pos/components';
import PermissionRoute from '@app/router/PermissionRoute';
import { permissionForPath } from '@core/lib/route-permissions';
import { IndustryRegistry } from './IndustryRegistry';
import { useCurrentIndustry } from './useCurrentIndustry';
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

  // Several packs may declare the same path (e.g. `/emi-plans/:id` in mobile
  // and appliances). React Router would always open the first one, so each
  // path gets one route that renders the active pack's page.
  const byPath = new Map<string, Array<{ packId: string; node: ReactElement }>>();

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

      const list = byPath.get(r.path) ?? [];
      list.push({ packId: pack.id, node });
      byPath.set(r.path, list);
    }
  }

  const nodes: ReactElement[] = [];
  for (const [path, options] of byPath) {
    const element = options.length === 1 ? options[0].node : <ActivePackRoute options={options} />;
    nodes.push(<Route key={`${options[0].packId}::${path}`} path={path} element={element} />);
  }
  return nodes;
}

/** Renders the active pack's page for a path that several packs declare; the first pack's otherwise. */
function ActivePackRoute({ options }: { options: Array<{ packId: string; node: ReactElement }> }) {
  const industry = useCurrentIndustry();
  return (options.find((o) => o.packId === industry?.id) ?? options[0]).node;
}

/** Alias for readability at call site */
export function IndustryRoutes(): ReactElement[] {
  return industryRoutes();
}

export type { IndustryRoute };
