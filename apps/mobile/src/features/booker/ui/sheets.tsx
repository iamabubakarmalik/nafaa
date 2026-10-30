/**
 * Bottom sheets on the customer screen: the no-order reason and a
 * recovery (old balance money, saved as PENDING until the office checks it).
 */

import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { cn } from '@/lib/cn';
import type { MoneyMethod } from '../core/types';
import { ActionButton, rs } from './parts';

function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="rounded-t-3xl bg-white dark:bg-neutral-900 px-5 pt-4 pb-8 max-h-[85%]">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-extrabold text-neutral-900 dark:text-white">{title}</Text>
            <Pressable onPress={onClose} hitSlop={12} className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center">
              <X size={16} color="#737373" />
            </Pressable>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const inputCls = 'h-12 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-4 text-sm text-neutral-900 dark:text-white';

export function NoOrderSheet({ visible, reasons, onClose, onSave, saving }: {
  visible: boolean;
  reasons: { code: string; label: string }[];
  onClose: () => void;
  onSave: (code: string, note: string) => void;
  saving?: boolean;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [note, setNote] = useState('');
  return (
    <Sheet visible={visible} title="Order nahi mila — wajah" onClose={onClose}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <View className="gap-2">
          {reasons.map((r) => (
            <Pressable
              key={r.code}
              onPress={() => setCode(r.code)}
              className={cn('h-12 rounded-2xl border px-4 flex-row items-center justify-between',
                code === r.code ? 'border-teal-600 bg-teal-50 dark:bg-teal-950' : 'border-neutral-200 dark:border-neutral-700')}
            >
              <Text className="text-sm font-extrabold text-neutral-800 dark:text-neutral-100">{r.label}</Text>
              {code === r.code && <Check size={18} color="#115e59" />}
            </Pressable>
          ))}
        </View>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Note (agar zaroorat ho)"
          placeholderTextColor="#9ca3af"
          className={cn(inputCls, 'mt-3')}
          maxLength={300}
        />
        <ActionButton
          label="Save karein"
          className="mt-4"
          disabled={!code}
          loading={saving}
          onPress={() => code && onSave(code, note)}
        />
      </ScrollView>
    </Sheet>
  );
}

const METHODS: { key: MoneyMethod; label: string }[] = [
  { key: 'CASH', label: 'Cash' },
  { key: 'BANK_TRANSFER', label: 'Bank' },
  { key: 'JAZZCASH', label: 'JazzCash' },
  { key: 'EASYPAISA', label: 'Easypaisa' },
  { key: 'CHEQUE', label: 'Cheque' },
];

export function RecoverySheet({ visible, balance, onClose, onSave, saving }: {
  visible: boolean;
  balance: number | null;
  onClose: () => void;
  onSave: (v: { amount: number; method: MoneyMethod; reference: string; note: string; cheque?: { bankName: string; chequeNo: string; chequeDate: string } }) => void;
  saving?: boolean;
}) {
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<MoneyMethod>('CASH');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const value = Number(amount.replace(/,/g, ''));
  const chequeOk = method !== 'CHEQUE' || (!!bankName.trim() && !!chequeNo.trim() && /^\d{4}-\d{2}-\d{2}$/.test(chequeDate));
  const ok = Number.isFinite(value) && value >= 0.01 && chequeOk;
  return (
    <Sheet visible={visible} title="Recovery" onClose={onClose}>
      <ScrollView keyboardShouldPersistTaps="handled">
        {balance != null && (
          <Text className="text-xs text-neutral-500 mb-2">Khata balance: <Text className={balance > 0 ? 'font-extrabold text-red-600' : 'font-extrabold text-neutral-700 dark:text-neutral-200'}>{rs(balance)}</Text></Text>
        )}
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="Amount (Rs)"
          placeholderTextColor="#9ca3af"
          keyboardType="decimal-pad"
          className={cn(inputCls, 'text-lg font-extrabold')}
        />
        <View className="flex-row flex-wrap gap-2 mt-3">
          {METHODS.map((m) => (
            <Pressable
              key={m.key}
              onPress={() => setMethod(m.key)}
              className={cn('h-10 px-4 rounded-full border items-center justify-center',
                method === m.key ? 'bg-neutral-900 border-neutral-900 dark:bg-white dark:border-white' : 'border-neutral-200 dark:border-neutral-700')}
            >
              <Text className={cn('text-xs font-extrabold', method === m.key ? 'text-white dark:text-neutral-900' : 'text-neutral-600 dark:text-neutral-300')}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
        {method === 'CHEQUE' && (
          <View className="mt-3 gap-2">
            <TextInput value={bankName} onChangeText={setBankName} placeholder="Bank (HBL, MCB…)" placeholderTextColor="#9ca3af" className={inputCls} maxLength={80} />
            <TextInput value={chequeNo} onChangeText={setChequeNo} placeholder="Cheque number" placeholderTextColor="#9ca3af" className={inputCls} maxLength={40} />
            <TextInput value={chequeDate} onChangeText={setChequeDate} placeholder="Cheque date YYYY-MM-DD" placeholderTextColor="#9ca3af" className={inputCls} maxLength={10} />
            <Text className="text-[11px] text-neutral-500">Aage ki date = post-dated cheque. Bounce hua to khata me wapas lag jayega.</Text>
          </View>
        )}
        {method !== 'CASH' && method !== 'CHEQUE' && (
          <TextInput value={reference} onChangeText={setReference} placeholder="Reference / TID" placeholderTextColor="#9ca3af" className={cn(inputCls, 'mt-3')} maxLength={80} />
        )}
        <TextInput value={note} onChangeText={setNote} placeholder="Note" placeholderTextColor="#9ca3af" className={cn(inputCls, 'mt-3')} maxLength={300} />
        <Text className="text-[11px] text-neutral-500 mt-3">Office check karega, phir ye amount khata me jama hoga.</Text>
        <ActionButton
          label={ok ? `Save ${rs(value)}` : 'Save'}
          className="mt-4"
          disabled={!ok}
          loading={saving}
          onPress={() => onSave({
            amount: Math.round(value * 100) / 100, method, reference, note,
            ...(method === 'CHEQUE' && { cheque: { bankName: bankName.trim(), chequeNo: chequeNo.trim(), chequeDate } }),
          })}
        />
      </ScrollView>
    </Sheet>
  );
}
