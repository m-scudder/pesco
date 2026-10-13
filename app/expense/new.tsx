import React, { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Body, Card, ScopeSwitch } from '@/components/UI';
import { useAppTheme } from '@/theme/ThemeContext';
export default function AddExpense() {
  const { colors, scope } = useAppTheme();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  return <Screen><ScopeSwitch /><Card><Row label="Date" value="Today" /><View style={{ height: 1, backgroundColor: colors.border }} /><View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ width: 96 }}><Body>Amount</Body></View><TextInput accessibilityLabel="Amount" placeholder="0.00" placeholderTextColor={colors.muted} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" style={{ flex: 1, fontSize: 24, color: colors.text }} /></View><View style={{ height: 1, backgroundColor: colors.border }} /><Row label="Category" value="Select category (coming soon)" /><View style={{ height: 1, backgroundColor: colors.border }} /><View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ width: 96 }}><Body>Note</Body></View><TextInput accessibilityLabel="Note" placeholder="Optional" placeholderTextColor={colors.muted} value={note} onChangeText={setNote} style={{ flex: 1, fontSize: 16, color: colors.text }} /></View><View style={{ height: 1, backgroundColor: colors.border }} /><Row label="Receipt" value="Optional (coming soon)" /></Card><Pressable accessibilityRole="button" onPress={() => Alert.alert('Not connected yet', `Saving ${scope} expenses will be enabled after the secure backend is implemented. Your entry has not been saved.`)} style={{ backgroundColor: scope === 'household' ? colors.household : colors.personal, padding: 17, alignItems: 'center', borderRadius: 14 }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Save Expense</Text></Pressable></Screen>;
}
function Row({ label, value }: {label: string; value: string}) { return <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 40 }}><View style={{ width: 96 }}><Body>{label}</Body></View><View style={{ flex: 1 }}><Body muted>{value}</Body></View></View>; }
