import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowLeft } from 'lucide-react';
import { Button, Card } from '@/ui';

export default function GoogleErrorPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rawMessage = params.get('message') || params.get('error') || 'Google login failed';
  const message = decodeURIComponent(rawMessage);

  useEffect(() => {
    const t = setTimeout(() => navigate('/login', { replace: true }), 5000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen-dvh flex items-center justify-center bg-gradient-mesh p-4">
      <Card className="max-w-sm w-full p-6 text-center space-y-4 shadow-soft-lg">
        <div className="h-16 w-16 mx-auto rounded-3xl bg-danger/10 flex items-center justify-center">
          <XCircle className="h-8 w-8 text-danger" />
        </div>
        <div>
          <div className="font-black text-lg text-content">Login failed</div>
          <div className="text-sm text-content-muted mt-1">{message}</div>
          <div className="text-2xs text-content-subtle mt-3">
            Redirecting to login in 5 seconds...
          </div>
        </div>
        <Button
          variant="gradient"
          size="lg"
          fullWidth
          onClick={() => navigate('/login', { replace: true })}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Back to login
        </Button>
      </Card>
    </div>
  );
}
