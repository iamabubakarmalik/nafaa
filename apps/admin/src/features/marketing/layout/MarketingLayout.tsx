import { Outlet } from 'react-router-dom';
import { MarketingSidebar } from '../_shared/components/MarketingSidebar';

export function MarketingLayout() {
  return (
    <div className="flex min-h-screen bg-neutral-50">
      <MarketingSidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
