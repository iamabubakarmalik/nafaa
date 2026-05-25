import React, { Component, ReactNode } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { Crash } from '@/lib/crashReporting';

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null }

/**
 * Global error boundary — catches any uncaught React error,
 * reports to Crashlytics, and shows a fallback UI with retry.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Crash.recordError(error, {
      componentStack: errorInfo.componentStack?.slice(0, 500) || 'unknown',
      boundary: 'global',
    });
    this.setState({ errorInfo });
  }

  reset = () => this.setState({ hasError: false, error: null, errorInfo: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}>
          <View className="items-center mb-6">
            <View className="h-20 w-20 rounded-3xl bg-rose-100 dark:bg-rose-950/40 items-center justify-center mb-4">
              <AlertTriangle size={40} color="#dc2626" />
            </View>
            <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white text-center">
              Kuch ghalat ho gaya
            </Text>
            <Text className="text-sm text-neutral-500 dark:text-neutral-400 text-center mt-2 leading-5">
              App mein ek unexpected error aaya. Team ko report ho gayi hai. Aap retry kar sakte hain.
            </Text>
          </View>

          {__DEV__ && this.state.error && (
            <View className="bg-rose-50 dark:bg-rose-950/40 rounded-2xl p-3 mb-6 border border-rose-200">
              <Text className="text-xs font-bold text-rose-700 mb-1">DEV — Error:</Text>
              <Text className="text-xs text-rose-900 dark:text-rose-200 font-mono">
                {this.state.error.message}
              </Text>
            </View>
          )}

          <Pressable
            onPress={this.reset}
            className="h-14 rounded-2xl bg-emerald-600 items-center justify-center flex-row gap-2 active:opacity-80"
            style={{ shadowColor: '#16a34a', shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 }}
          >
            <RefreshCw size={18} color="#ffffff" />
            <Text className="text-white font-extrabold text-base">Retry</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }
}
