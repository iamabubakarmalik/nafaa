import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Modal, TextInput, Alert,
  KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Lock, Mail, Shield, Plus, Unlink, CheckCircle2, AlertCircle,
  Eye, EyeOff, KeyRound, ArrowRight, Smartphone, Zap, Star,
  Sparkles, Award, Activity, X,
} from 'lucide-react-native';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import Toast from 'react-native-toast-message';

export function AccountSecurity() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const { data: me } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      try {
        const res = await (authApi as any).me();
        return res;
      } catch {
        return null;
      }
    },
  });

  const u: any = (me as any)?.user || user;
  const hasPassword = u?.hasPassword !== false;
  const hasGoogle = !!u?.googleId;
  const emailVerified = !!u?.emailVerified;
  const has2FA = !!u?.twoFactorEnabled;

  const disconnectGoogleMutation = useMutation({
    mutationFn: () => (authApi as any).disconnectGoogle(),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Google disconnected' });
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const checks = [
    { label: 'Email verified', done: emailVerified, weight: 30 },
    { label: 'Password set', done: hasPassword, weight: 25 },
    { label: 'Google connected', done: hasGoogle, weight: 20 },
    { label: '2-Factor enabled', done: has2FA, weight: 25 },
  ];
  const score = checks.reduce((s, c) => s + (c.done ? c.weight : 0), 0);
  const scoreColor = score >= 75 ? '#16a34a' : score >= 50 ? '#f59e0b' : '#dc2626';
  const scoreBg = score >= 75 ? '#f0fdf4' : score >= 50 ? '#fffbeb' : '#fef2f2';
  const scoreBorder = score >= 75 ? '#86efac' : score >= 50 ? '#fcd34d' : '#fca5a5';

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View className="rounded-3xl overflow-hidden mb-4" style={{ backgroundColor: '#065f46' }}>
        <View className="p-5">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 rounded-2xl bg-white/15 items-center justify-center">
              <Shield size={24} color="#ffffff" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-1 mb-1">
                <Sparkles size={10} color="#fde68a" />
                <Text className="text-[9px] uppercase tracking-wider text-white/80 font-extrabold">
                  Security Center
                </Text>
              </View>
              <Text className="text-lg font-extrabold text-white">Account & Security</Text>
              <Text className="text-[11px] text-white/80 font-semibold mt-0.5">
                Login methods aur security manage karein
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Security Score */}
      <View
        className="rounded-3xl border-2 p-5 mb-4"
        style={{ backgroundColor: scoreBg, borderColor: scoreBorder }}
      >
        <View className="flex-row items-center gap-3 mb-4">
          <View
            className="h-16 w-16 rounded-3xl items-center justify-center"
            style={{ backgroundColor: scoreColor }}
          >
            <Award size={30} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text className="text-xs uppercase tracking-wider font-extrabold" style={{ color: scoreColor }}>
              Security Score
            </Text>
            <View className="flex-row items-baseline gap-1">
              <Text className="text-4xl font-extrabold text-slate-900">{score}</Text>
              <Text className="text-2xl font-extrabold text-slate-900">%</Text>
            </View>
            <Text className="text-xs font-semibold text-slate-600 mt-1">
              {score >= 75 && '🛡️ Account secure hai'}
              {score >= 50 && score < 75 && '⚠️ Improve ho sakta hai'}
              {score < 50 && '🚨 Aur secure karein'}
            </Text>
          </View>
        </View>

        <View className="h-3 rounded-full overflow-hidden mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}>
          <View
            className="h-full rounded-full"
            style={{ width: `${score}%`, backgroundColor: scoreColor }}
          />
        </View>

        <View className="gap-2">
          {checks.map((c) => (
            <View
              key={c.label}
              className="flex-row items-center gap-2 rounded-xl px-3 py-2"
              style={{
                backgroundColor: c.done ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
                borderWidth: 1,
                borderColor: c.done ? '#86efac' : '#e2e8f0',
              }}
            >
              <View
                className="h-7 w-7 rounded-lg items-center justify-center"
                style={{ backgroundColor: c.done ? '#dcfce7' : '#f1f5f9' }}
              >
                {c.done ? (
                  <CheckCircle2 size={14} color="#16a34a" />
                ) : (
                  <AlertCircle size={14} color="#94a3b8" />
                )}
              </View>
              <Text
                className="text-xs font-extrabold flex-1"
                style={{ color: c.done ? '#1e293b' : '#64748b' }}
              >
                {c.label}
              </Text>
              <Text
                className="text-[10px] font-extrabold"
                style={{ color: c.done ? '#16a34a' : '#94a3b8' }}
              >
                +{c.weight}%
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Email Verification */}
      <View
        className="rounded-2xl border-2 p-4 flex-row items-center gap-3 mb-4"
        style={{
          backgroundColor: emailVerified ? '#f0fdf4' : '#fffbeb',
          borderColor: emailVerified ? '#86efac' : '#fcd34d',
        }}
      >
        <View
          className="h-12 w-12 rounded-2xl items-center justify-center"
          style={{ backgroundColor: emailVerified ? '#16a34a' : '#f59e0b' }}
        >
          {emailVerified ? <CheckCircle2 size={22} color="#ffffff" /> : <Mail size={22} color="#ffffff" />}
        </View>
        <View className="flex-1">
          <Text
            className="font-extrabold"
            style={{ color: emailVerified ? '#065f46' : '#92400e' }}
          >
            {emailVerified ? 'Email Verified ✓' : 'Verification Pending'}
          </Text>
          <Text
            className="text-xs font-semibold mt-0.5"
            style={{ color: emailVerified ? '#047857' : '#b45309' }}
            numberOfLines={1}
          >
            {u?.email}
          </Text>
        </View>
        {!emailVerified && (
          <Pressable
            onPress={() => router.push('/auth/verify-email' as any)}
            className="h-9 px-3 rounded-xl flex-row items-center gap-1"
            style={{ backgroundColor: '#f59e0b' }}
          >
            <Text className="text-white text-xs font-extrabold">Verify</Text>
            <ArrowRight size={12} color="#ffffff" />
          </Pressable>
        )}
      </View>

      {/* Login Methods */}
      <Text className="text-xs font-extrabold uppercase text-slate-500 tracking-wider mb-2">
        Login Methods
      </Text>

      {/* Email/Password */}
      <View className="rounded-2xl bg-white border-2 border-slate-200 p-4 mb-2">
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-12 rounded-2xl bg-blue-600 items-center justify-center">
            <Mail size={22} color="#ffffff" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5 flex-wrap">
              <Text className="font-extrabold text-slate-900">Email & Password</Text>
              {hasPassword && (
                <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100">
                  <CheckCircle2 size={10} color="#16a34a" />
                  <Text className="text-[9px] font-extrabold text-emerald-700">ACTIVE</Text>
                </View>
              )}
            </View>
            <Text className="text-xs text-slate-500 font-semibold mt-0.5">
              {hasPassword ? 'Email/password se login active' : 'Password set karein'}
            </Text>
          </View>
        </View>
        <View className="mt-3">
          {hasPassword ? (
            <Pressable
              onPress={() => setShowChangePassword(true)}
              className="h-11 rounded-xl bg-slate-100 flex-row items-center justify-center gap-1.5"
            >
              <KeyRound size={14} color="#334155" />
              <Text className="text-slate-800 text-sm font-bold">Change Password</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => setShowSetPassword(true)}
              className="h-11 rounded-xl bg-blue-600 flex-row items-center justify-center gap-1.5"
            >
              <Plus size={14} color="#ffffff" />
              <Text className="text-white text-sm font-extrabold">Set Password</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Google */}
      <View className="rounded-2xl bg-white border-2 border-slate-200 p-4 mb-2">
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-12 rounded-2xl bg-white border-2 border-slate-200 items-center justify-center">
            <Text className="text-2xl font-bold" style={{ color: '#4285F4' }}>G</Text>
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5 flex-wrap">
              <Text className="font-extrabold text-slate-900">Google Account</Text>
              {hasGoogle && (
                <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100">
                  <CheckCircle2 size={10} color="#16a34a" />
                  <Text className="text-[9px] font-extrabold text-emerald-700">CONNECTED</Text>
                </View>
              )}
            </View>
            <Text className="text-xs text-slate-500 font-semibold mt-0.5">
              {hasGoogle ? 'One-tap login enabled' : 'Quick login connect karein'}
            </Text>
          </View>
        </View>
        <View className="mt-3">
          {hasGoogle ? (
            <Pressable
              onPress={() => {
                if (!hasPassword) {
                  Toast.show({
                    type: 'error',
                    text1: 'Pehle password set karein',
                    text2: 'Warna login nahi kar paayenge',
                  });
                  return;
                }
                Alert.alert(
                  'Disconnect Google?',
                  'Aap email/password se login kar sakenge',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Disconnect',
                      style: 'destructive',
                      onPress: () => disconnectGoogleMutation.mutate(),
                    },
                  ],
                );
              }}
              disabled={disconnectGoogleMutation.isPending}
              className="h-11 rounded-xl border-2 border-rose-300 flex-row items-center justify-center gap-1.5"
              style={{ backgroundColor: '#fef2f2' }}
            >
              <Unlink size={14} color="#dc2626" />
              <Text className="text-rose-700 text-sm font-extrabold">Disconnect</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                const url = (authApi as any).googleLoginUrl?.();
                if (url) Linking.openURL(url);
              }}
              className="h-11 rounded-xl bg-slate-100 flex-row items-center justify-center gap-1.5"
            >
              <Plus size={14} color="#334155" />
              <Text className="text-slate-800 text-sm font-bold">Connect Google</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* 2FA Coming Soon */}
      <View className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-4 mb-4" style={{ opacity: 0.8 }}>
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-12 rounded-2xl bg-violet-600 items-center justify-center">
            <Zap size={22} color="#ffffff" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5 flex-wrap">
              <Text className="font-extrabold text-slate-900">2-Factor Auth</Text>
              <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100">
                <Star size={10} color="#b45309" />
                <Text className="text-[9px] font-extrabold text-amber-700">COMING SOON</Text>
              </View>
            </View>
            <Text className="text-xs text-slate-500 font-semibold mt-0.5">
              SMS / Authenticator app
            </Text>
          </View>
        </View>
      </View>

      {/* Set Password Modal */}
      <SetPasswordModal
        visible={showSetPassword}
        onClose={() => setShowSetPassword(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['auth-me'] })}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        visible={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </ScrollView>
  );
}

// ═════ Set Password Modal ═════
function SetPasswordModal({
  visible, onClose, onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [pwd, setPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [show, setShow] = useState(false);

  const strength = (() => {
    if (!pwd) return { score: 0, label: '', color: '#94a3b8' };
    let s = 0;
    if (pwd.length >= 8) s++;
    if (pwd.length >= 12) s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/[0-9]/.test(pwd)) s++;
    if (/[^A-Za-z0-9]/.test(pwd)) s++;
    if (s <= 1) return { score: 20, label: 'Weak', color: '#dc2626' };
    if (s === 2) return { score: 40, label: 'Fair', color: '#ea580c' };
    if (s === 3) return { score: 60, label: 'Good', color: '#f59e0b' };
    if (s === 4) return { score: 80, label: 'Strong', color: '#16a34a' };
    return { score: 100, label: 'Very Strong', color: '#16a34a' };
  })();

  const mutation = useMutation({
    mutationFn: () => (authApi as any).setPassword(pwd),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Password set ho gaya! 🎉' });
      setPwd('');
      setConfirmPwd('');
      onSuccess();
      onClose();
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const canSubmit = pwd.length >= 8 && pwd === confirmPwd;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white">
        <View className="p-5" style={{ backgroundColor: '#1e40af' }}>
          <View className="flex-row items-center justify-between mb-3">
            <View className="h-12 w-12 rounded-2xl bg-white/20 items-center justify-center">
              <KeyRound size={22} color="#ffffff" />
            </View>
            <Pressable onPress={onClose} hitSlop={12} className="h-10 w-10 rounded-2xl bg-white/15 items-center justify-center">
              <X size={20} color="#ffffff" />
            </Pressable>
          </View>
          <Text className="text-xl font-extrabold text-white">Set Password</Text>
          <Text className="text-blue-100 text-sm font-semibold mt-1">
            Email/password se bhi login kar sakenge
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          <Text className="text-sm font-bold text-slate-700 mb-1.5">Naya Password</Text>
          <View className="flex-row items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-3 h-12 mb-2">
            <Lock size={16} color="#94a3b8" />
            <TextInput
              value={pwd}
              onChangeText={setPwd}
              secureTextEntry={!show}
              placeholder="Min 8 characters"
              placeholderTextColor="#94a3b8"
              autoFocus
              className="flex-1 text-sm font-bold text-slate-900"
            />
            <Pressable onPress={() => setShow(!show)} hitSlop={8}>
              {show ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
            </Pressable>
          </View>

          {pwd && (
            <View className="mb-4">
              <View className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                <View
                  className="h-full rounded-full"
                  style={{ width: `${strength.score}%`, backgroundColor: strength.color }}
                />
              </View>
              <Text className="text-[10px] font-extrabold" style={{ color: strength.color }}>
                Strength: {strength.label}
              </Text>
            </View>
          )}

          <Text className="text-sm font-bold text-slate-700 mb-1.5">Confirm Password</Text>
          <View className="flex-row items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-3 h-12">
            <Lock size={16} color="#94a3b8" />
            <TextInput
              value={confirmPwd}
              onChangeText={setConfirmPwd}
              secureTextEntry={!show}
              placeholder="Same password again"
              placeholderTextColor="#94a3b8"
              className="flex-1 text-sm font-bold text-slate-900"
            />
          </View>
          {confirmPwd && pwd !== confirmPwd && (
            <Text className="text-xs text-rose-600 font-extrabold mt-1">Passwords match nahi karte</Text>
          )}
        </ScrollView>

        <View className="p-4 border-t-2 border-slate-100 flex-row gap-2 bg-slate-50">
          <Pressable
            onPress={onClose}
            className="flex-1 h-12 rounded-xl bg-slate-100 items-center justify-center"
          >
            <Text className="font-bold text-slate-800">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className="flex-1 h-12 rounded-xl flex-row items-center justify-center gap-1.5"
            style={{ backgroundColor: canSubmit && !mutation.isPending ? '#1e40af' : '#94a3b8' }}
          >
            <KeyRound size={14} color="#ffffff" />
            <Text className="text-white font-extrabold">
              {mutation.isPending ? 'Setting...' : 'Set Password'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ═════ Change Password Modal ═════
function ChangePasswordModal({
  visible, onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmNext, setConfirmNext] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);

  const mutation = useMutation({
    mutationFn: () => (authApi as any).changePassword(current, next),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Password change ho gaya' });
      setCurrent('');
      setNext('');
      setConfirmNext('');
      onClose();
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const canSubmit =
    current.length >= 6 && next.length >= 8 && next === confirmNext && next !== current;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white">
        <View className="p-5" style={{ backgroundColor: '#065f46' }}>
          <View className="flex-row items-center justify-between mb-3">
            <View className="h-12 w-12 rounded-2xl bg-white/20 items-center justify-center">
              <KeyRound size={22} color="#ffffff" />
            </View>
            <Pressable onPress={onClose} hitSlop={12} className="h-10 w-10 rounded-2xl bg-white/15 items-center justify-center">
              <X size={20} color="#ffffff" />
            </Pressable>
          </View>
          <Text className="text-xl font-extrabold text-white">Change Password</Text>
          <Text className="text-emerald-100 text-sm font-semibold mt-1">Update your password</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          <Text className="text-sm font-bold text-slate-700 mb-1.5">Current Password</Text>
          <View className="flex-row items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-3 h-12 mb-4">
            <Lock size={16} color="#94a3b8" />
            <TextInput
              value={current}
              onChangeText={setCurrent}
              secureTextEntry={!showCurrent}
              autoFocus
              className="flex-1 text-sm font-bold text-slate-900"
            />
            <Pressable onPress={() => setShowCurrent(!showCurrent)} hitSlop={8}>
              {showCurrent ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
            </Pressable>
          </View>

          <Text className="text-sm font-bold text-slate-700 mb-1.5">New Password</Text>
          <View className="flex-row items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-3 h-12 mb-4">
            <Lock size={16} color="#94a3b8" />
            <TextInput
              value={next}
              onChangeText={setNext}
              secureTextEntry={!showNext}
              placeholder="Min 8 characters"
              placeholderTextColor="#94a3b8"
              className="flex-1 text-sm font-bold text-slate-900"
            />
            <Pressable onPress={() => setShowNext(!showNext)} hitSlop={8}>
              {showNext ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
            </Pressable>
          </View>

          <Text className="text-sm font-bold text-slate-700 mb-1.5">Confirm New Password</Text>
          <View className="flex-row items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-3 h-12">
            <Lock size={16} color="#94a3b8" />
            <TextInput
              value={confirmNext}
              onChangeText={setConfirmNext}
              secureTextEntry={!showNext}
              className="flex-1 text-sm font-bold text-slate-900"
            />
          </View>
          {confirmNext && next !== confirmNext && (
            <Text className="text-xs text-rose-600 font-extrabold mt-1">Passwords match nahi karte</Text>
          )}
          {next && next === current && (
            <Text className="text-xs text-amber-600 font-extrabold mt-1">
              Naya password current se alag hona chahiye
            </Text>
          )}
        </ScrollView>

        <View className="p-4 border-t-2 border-slate-100 flex-row gap-2 bg-slate-50">
          <Pressable
            onPress={onClose}
            className="flex-1 h-12 rounded-xl bg-slate-100 items-center justify-center"
          >
            <Text className="font-bold text-slate-800">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className="flex-1 h-12 rounded-xl flex-row items-center justify-center gap-1.5"
            style={{ backgroundColor: canSubmit && !mutation.isPending ? '#065f46' : '#94a3b8' }}
          >
            <KeyRound size={14} color="#ffffff" />
            <Text className="text-white font-extrabold">
              {mutation.isPending ? 'Updating...' : 'Update'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
