/**
 * Catches a render error inside a screen or widget, reports it to crash
 * reporting and shows a friendly message with Retry instead of an empty area.
 * Screen and ListTemplate wrap their content in one, so a failing screen keeps
 * its header (and back button); Home wraps every widget.
 *
 *   <ErrorBoundary name="home:sales-chart" compact title={t('Sales')}>…</ErrorBoundary>
 */

import { RefreshCw, TriangleAlert } from 'lucide-react-native';
import { Component, type ReactNode } from 'react';
import { t } from '@/core/i18n';
import { recordError } from '@/core/device/crash-reporting';
import { Button } from './Button';
import { Card } from './Card';
import { EmptyState } from './States';

interface Props {
  children?: ReactNode;
  /** Where it failed, for crash reports. */
  name?: string;
  /** Small card (widgets) instead of a full-area message (screens). */
  compact?: boolean;
  /** Card title for compact boundaries. */
  title?: string;
}

export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    const where = this.props.name ?? 'screen';
    recordError(error, `render error in ${where}${info.componentStack ? `\n${info.componentStack.slice(0, 1500)}` : ''}`);
    if (__DEV__) console.error(`[ErrorBoundary ${where}]`, error);
  }

  private retry = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    const retry = <Button variant="secondary" size={this.props.compact ? 'sm' : undefined} icon={RefreshCw} onPress={this.retry}>{t('Dobara try karein')}</Button>;
    if (this.props.compact) {
      return (
        <Card title={this.props.title}>
          <EmptyState compact icon={TriangleAlert} tone="danger" title={t('Ye hissa abhi nahi khul saka.')} action={retry} />
        </Card>
      );
    }
    return (
      <EmptyState icon={TriangleAlert} tone="danger" title={t('Ye screen abhi nahi khul saki.')}
        message={t('Masla report ho gaya hai. Dobara try karein ya wapas ja kar phir kholein.')} action={retry} />
    );
  }
}
