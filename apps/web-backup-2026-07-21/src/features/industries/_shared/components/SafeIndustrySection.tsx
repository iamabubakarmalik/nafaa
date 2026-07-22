import { Component, type ReactNode } from 'react';
import { IndustrySection, IndustryVariantExtra, useActiveIndustryPlugin } from './IndustrySection';

class IndustryErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: any) { console.warn('[IndustrySection]', err); }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export function SafeIndustrySection(props: any) {
  return <IndustryErrorBoundary><IndustrySection {...props} /></IndustryErrorBoundary>;
}
export function SafeIndustryVariantExtra(props: any) {
  return <IndustryErrorBoundary><IndustryVariantExtra {...props} /></IndustryErrorBoundary>;
}
export { useActiveIndustryPlugin };
