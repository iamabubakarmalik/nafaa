/**
 * The official "Sign in with Apple" button (iOS only, Apple's own artwork and
 * wording). Black on light themes, white on dark, same height and corners as
 * the Google button. Renders nothing where Apple sign-in is not available.
 */

import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@/design';
import { appleAuth } from '../lib/apple';

export function AppleButton({ kind = 'sign-in', onPress, loading, disabled, available }: {
  kind?: 'sign-in' | 'sign-up' | 'continue';
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  available: boolean;
}) {
  const th = useTheme();
  const AppleAuthentication = appleAuth();
  if (!available || !AppleAuthentication) return null;
  const type = kind === 'sign-up'
    ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
    : kind === 'continue' ? AppleAuthentication.AppleAuthenticationButtonType.CONTINUE : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN;
  const style = th.isDark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK;
  const blocked = disabled || loading;
  return (
    <View style={{ height: th.control('lg'), opacity: disabled ? 0.5 : 1 }} pointerEvents={blocked ? 'none' : 'auto'}>
      <AppleAuthentication.AppleAuthenticationButton
        // Remount when the theme flips: the native button keeps its first style.
        key={`${type}-${style}`}
        buttonType={type}
        buttonStyle={style}
        cornerRadius={th.radius('lg')}
        style={{ width: '100%', height: th.control('lg') }}
        onPress={onPress}
      />
      {loading ? (
        <View style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, alignItems: 'center', justifyContent: 'center', borderRadius: th.radius('lg'), backgroundColor: th.isDark ? '#ffffff' : '#000000' }}>
          <ActivityIndicator color={th.isDark ? '#000000' : '#ffffff'} />
        </View>
      ) : null}
    </View>
  );
}
