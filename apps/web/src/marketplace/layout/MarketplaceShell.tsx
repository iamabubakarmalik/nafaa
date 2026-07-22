import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { LocationBar } from './LocationBar';

export default function MarketplaceShell() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <TopBar />
      <LocationBar />
      <main className="max-w-5xl mx-auto px-4 py-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
