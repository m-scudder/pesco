import React from 'react';
import { View } from 'react-native';
import { Screen } from '@/components/Screen';
import { AddExpenseButton } from '@/components/AddExpenseButton';
import { Body, Card, Heading, ScopeSwitch } from '@/components/UI';
import { useAppTheme } from '@/theme/ThemeContext';
export default function Home() {
  const { scope } = useAppTheme();
  return <View style={{ flex: 1 }}><Screen><Heading subtitle="Your monthly spending overview">PESCO</Heading><ScopeSwitch /><Card><Body muted>{scope === 'household' ? 'Household spending' : 'Private personal spending'}</Body><Heading>₹0.00</Heading><Body muted>No budget set · Optional in Settings</Body></Card><Heading subtitle="Your most recent entries will appear here">Recent expenses</Heading><Card><Body muted>No expenses yet. Tap + to add your first expense.</Body></Card></Screen><AddExpenseButton /></View>;
}
