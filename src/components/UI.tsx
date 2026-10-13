import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeContext';
export function Heading({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  const { colors } = useAppTheme();
  return <View style={{ gap: 5 }}><Text style={[styles.title, { color: colors.text }]}>{children}</Text>{subtitle ? <Text style={{ color: colors.muted }}>{subtitle}</Text> : null}</View>;
}
export function Card({ children }: { children: React.ReactNode }) {
  const { colors } = useAppTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View>;
}
export function Body({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  const { colors } = useAppTheme();
  return <Text style={{ color: muted ? colors.muted : colors.text, fontSize: 15 }}>{children}</Text>;
}
export function ScopeSwitch() {
  const { colors, scope, setScope } = useAppTheme();
  return <View style={[styles.switch, { backgroundColor: colors.secondary }]}>{(['household','personal'] as const).map(item => {
    const selected = scope === item;
    return <Pressable accessibilityRole="button" accessibilityState={{ selected }} key={item} onPress={() => setScope(item)} style={[styles.segment, selected && { backgroundColor: colors.surface }]}><Text style={{ color: selected ? (item === 'household' ? colors.household : colors.personal) : colors.muted, fontWeight: selected ? '700' : '500' }}>{item === 'household' ? 'Household' : 'Personal'}</Text></Pressable>;
  })}</View>;
}
const styles = StyleSheet.create({ title: { fontSize: 30, fontWeight: '700' }, card: { borderWidth: 1, borderRadius: 18, padding: 20, gap: 10 }, switch: { flexDirection: 'row', padding: 4, borderRadius: 14 }, segment: { flex: 1, paddingVertical: 12, borderRadius: 11, alignItems: 'center' } });
