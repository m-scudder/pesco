import React from 'react';
import { ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/theme/ThemeContext';
export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 20) + 12 }, style]}>{children}</ScrollView>;
}
const styles = StyleSheet.create({ content: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 120, gap: 20 } });
