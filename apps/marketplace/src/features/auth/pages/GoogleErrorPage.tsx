import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { Button, Card } from '@/ui';

export default function GoogleErrorPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const message = params.get('message') || 'Google login failed';

  useEffect(() => {
    const t = setTimeout(() => navigate('/login'), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen-dvh flex items-center justify-center bg-gradient-mesh p-4">
      <Card className="max-w-sm w-full p-6 text-center space-y-4">
        <XCircle className="h-16 w-16 text-danger mx-auto" />
        <div>
          <div className="font-black text-lg">Login failed</div>
          <div className="text-sm text-content-muted mt-1">{message}</div>
        </div>
        <Button variant="gradient" fullWidth onClick={() => navigate('/login')}>
          Back to login
        </Button>
      </Card>
    </div>
  );
}
