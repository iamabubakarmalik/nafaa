import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { LocationBar } from './LocationBar';

export default function MarketplaceShell() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 pb-20">
      <TopBar />
      <LocationBar />
      <main className="max-w-6xl mx-auto px-4 py-4 animate-fade-in">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
