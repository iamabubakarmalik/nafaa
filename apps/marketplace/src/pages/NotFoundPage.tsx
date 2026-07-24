import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Home, Search, ArrowLeft, MapPinOff } from 'lucide-react';
import { Button, Card } from '@/ui';

export default function NotFoundPage() {
  return (
    <>
      <Helmet><title>Page not found — Nafaa Bazaar</title></Helmet>

      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 md:p-10 text-center space-y-5">
          <div className="text-8xl md:text-9xl font-black gradient-text">404</div>

          <div>
            <h1 className="text-2xl md:text-3xl font-black flex items-center justify-center gap-2">
              <MapPinOff className="h-6 w-6 text-content-muted" />
              Page not found
            </h1>
            <p className="text-sm text-content-muted mt-2">
              This page doesn't exist or has been moved.
            </p>
          </div>

          <div className="flex gap-2">
            <Link to="/" className="flex-1">
              <Button variant="gradient" size="lg" fullWidth leftIcon={<Home className="h-4 w-4" />}>
                Home
              </Button>
            </Link>
            <Link to="/search" className="flex-1">
              <Button variant="secondary" size="lg" fullWidth leftIcon={<Search className="h-4 w-4" />}>
                Search
              </Button>
            </Link>
          </div>

          <Link to="/" className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to safety
          </Link>
        </Card>
      </div>
    </>
  );
}
