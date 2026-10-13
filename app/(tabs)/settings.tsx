import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Body, Card, Heading } from '@/components/UI';
import { useAppTheme } from '@/theme/ThemeContext';
import type { Appearance } from '@/theme/palette';
export default function Settings() {
  const { appearance, setAppearance, colors } = useAppTheme();
  return <Screen><Heading subtitle="Your preferences">Settings</Heading><Card><Body>Appearance</Body><View style={{ flexDirection: 'row', gap: 8 }}>{(['system','light','dark'] as Appearance[]).map(value => <Pressable accessibilityRole="button" accessibilityState={{ selected: appearance === value }} key={value} onPress={() => setAppearance(value)} style={{ flex: 1, padding: 12, alignItems: 'center', borderRadius: 10, backgroundColor: appearance === value ? colors.secondary : colors.background }}><Text style={{ color: colors.text, textTransform: 'capitalize' }}>{value}</Text></Pressable>)}</View></Card><Card><Body>Household and invitations</Body><Body muted>Available after authentication is connected.</Body></Card><Card><Body>Monthly budgets</Body><Body muted>Optional — no onboarding budget screen.</Body></Card></Screen>;
}
