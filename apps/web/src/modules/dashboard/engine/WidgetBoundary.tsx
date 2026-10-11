/** Keeps one broken widget from taking the whole dashboard down. */

import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/design-system/components';

interface State { failed: boolean }

export class WidgetBoundary extends Component<{ title: string; children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`Dashboard widget "${this.props.title}" failed`, error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex h-full min-h-[8rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <p className="text-[0.8125rem] text-slate-600">“{this.props.title}” load nahi hua.</p>
        <Button size="xs" variant="secondary" onClick={() => this.setState({ failed: false })}>Dobara koshish</Button>
      </div>
    );
  }
}
