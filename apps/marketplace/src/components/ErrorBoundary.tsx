import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button, Card } from '@/ui';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('ErrorBoundary caught:', error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen-dvh flex items-center justify-center p-4 bg-surface-muted">
          <Card className="max-w-md w-full p-6 md:p-8 text-center space-y-4">
            <div className="h-16 w-16 mx-auto rounded-3xl bg-danger/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-danger" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black">Something went wrong</h1>
              <p className="text-sm text-content-muted mt-2">
                We hit an unexpected error. Please try refreshing the page.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="p-3 rounded-xl bg-surface-muted text-left text-2xs font-mono text-content-muted overflow-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => (window.location.href = '/')}
                leftIcon={<Home className="h-4 w-4" />}
              >
                Home
              </Button>
              <Button
                variant="gradient"
                size="lg"
                fullWidth
                onClick={() => window.location.reload()}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                Reload
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
