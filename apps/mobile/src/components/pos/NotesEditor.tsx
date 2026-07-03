import {
  Modal, View, Text, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  X, StickyNote, MessageSquare, EyeOff, CheckCircle2, Trash2,
} from 'lucide-react-native';

interface Props {
  visible: boolean;
  productName: string;
  note: string;              // Customer-visible note
  internalNote: string;      // Team-only note
  onChange: (patch: { note?: string; internalNote?: string }) => void;
  onClose: () => void;
}

export function NotesEditor({
  visible, productName, note, internalNote, onChange, onClose,
}: Props) {
  const clearAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange({ note: '', internalNote: '' });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          {/* Header */}
          <View className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex-row items-center gap-3">
            <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#f59e0b' }}>
              <StickyNote size={20} color="#ffffff" />
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-xs uppercase tracking-wider text-amber-700 font-extrabold">
                Notes
              </Text>
              <Text className="text-base font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                {productName}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {/* Customer Note */}
            <View className="mb-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 p-4">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <MessageSquare size={16} color="#b45309" />
                  <Text className="text-xs font-extrabold text-amber-800 uppercase tracking-wider">
                    Customer Note
                  </Text>
                </View>
                {note.trim() && (
                  <Pressable
                    onPress={() => onChange({ note: '' })}
                    className="flex-row items-center gap-1"
                  >
                    <X size={11} color="#dc2626" />
                    <Text className="text-[10px] font-extrabold text-rose-600">Clear</Text>
                  </Pressable>
                )}
              </View>
              <Text className="text-[10px] text-amber-800 mb-2 leading-relaxed">
                💡 Ye note receipt aur WhatsApp pe customer ko dikhega. e.g. "1 piece extra tha, damage discount"
              </Text>
              <TextInput
                value={note}
                onChangeText={(t) => onChange({ note: t })}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholder='"1 piece damage tha, discount de dia", "customer VIP"'
                placeholderTextColor="#a78bfa"
                className="min-h-[100px] rounded-xl border-2 border-amber-200 bg-white p-3 text-sm font-bold text-neutral-900"
                style={{ textAlignVertical: 'top' }}
              />
              <Text className="text-[10px] text-amber-700 mt-1 text-right font-bold">
                {note.length} chars
              </Text>
            </View>

            {/* Internal Note */}
            <View className="rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 p-4">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <EyeOff size={16} color="#475569" />
                  <Text className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    Internal Note (Team Only)
                  </Text>
                </View>
                {internalNote.trim() && (
                  <Pressable
                    onPress={() => onChange({ internalNote: '' })}
                    className="flex-row items-center gap-1"
                  >
                    <X size={11} color="#dc2626" />
                    <Text className="text-[10px] font-extrabold text-rose-600">Clear</Text>
                  </Pressable>
                )}
              </View>
              <Text className="text-[10px] text-slate-600 mb-2 leading-relaxed">
                🔒 Sirf team dekhe gi. Receipt/WhatsApp pe NAHI jae ga. e.g. "regular customer, next time bhi same rate"
              </Text>
              <TextInput
                value={internalNote}
                onChangeText={(t) => onChange({ internalNote: t })}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholder='"regular customer, next time bhi same rate", "special discount case"'
                placeholderTextColor="#94a3b8"
                className="min-h-[100px] rounded-xl border-2 border-slate-300 bg-white p-3 text-sm font-bold text-neutral-900"
                style={{ textAlignVertical: 'top' }}
              />
              <Text className="text-[10px] text-slate-600 mt-1 text-right font-bold">
                {internalNote.length} chars
              </Text>
            </View>

            {(note.trim() || internalNote.trim()) && (
              <Pressable
                onPress={clearAll}
                className="mt-4 flex-row items-center justify-center gap-2 py-3 rounded-xl bg-rose-50 border-2 border-rose-300 active:opacity-70"
              >
                <Trash2 size={16} color="#dc2626" />
                <Text className="font-extrabold text-rose-700">Clear All Notes</Text>
              </Pressable>
            )}
          </ScrollView>

          {/* Footer */}
          <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <Pressable
              onPress={onClose}
              className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
              style={{ backgroundColor: '#16a34a' }}
            >
              <CheckCircle2 size={20} color="#ffffff" />
              <Text className="text-white font-extrabold text-base">Save Notes</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
