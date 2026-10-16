import {fontSizes,fontFamilies,fontWeights} from '@/theme/typography';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeContext';
export function AddExpenseButton() {
  const router = useRouter();
  const { colors, scope } = useAppTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel="Add expense" onPress={() => router.push('/expense/new')} style={[styles.fab, { backgroundColor: scope === 'household' ? colors.household : colors.personal }]}><Text style={styles.plus}>+</Text></Pressable>;
}
const styles = StyleSheet.create({ fab: { position: 'absolute', right: 22, bottom: 20, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: .18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }, plus: { color: '#fff', fontSize:fontSizes.display, lineHeight: 39, fontWeight: '300' } });
