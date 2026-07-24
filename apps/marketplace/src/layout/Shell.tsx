import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { LocationBar } from './LocationBar';
import { BottomNav } from './BottomNav';
import { Footer } from './Footer';

export default function Shell() {
  return (
    <div className="min-h-screen-dvh bg-surface-muted pb-20 lg:pb-0 flex flex-col">
      <TopBar />
      <LocationBar />
      <main id="main-content" className="flex-1 container mx-auto py-4 md:py-6 animate-fade-in">
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
