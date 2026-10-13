import React from 'react';
import { View } from 'react-native';
import { Screen } from '@/components/Screen';
import { AddExpenseButton } from '@/components/AddExpenseButton';
import { Body, Card, Heading, ScopeSwitch } from '@/components/UI';
export default function Expenses() { return <View style={{ flex: 1 }}><Screen><Heading subtitle="Search and filters will be connected in Milestone 3">Expenses</Heading><ScopeSwitch /><Card><Body muted>No expenses yet. Your date-grouped transaction history will appear here.</Body></Card></Screen><AddExpenseButton /></View>; }
