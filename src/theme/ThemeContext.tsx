import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Appearance, palette, Scope } from './palette';

type AppTheme = {
  appearance: Appearance;
  setAppearance: (value: Appearance) => void;
  scope: Scope;
  setScope: (value: Scope) => void;
  colors: typeof palette.light | typeof palette.dark;
  resolved: 'light' | 'dark';
};
const Context = createContext<AppTheme | null>(null);
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceScheme = useColorScheme();
  const [appearance, setAppearance] = useState<Appearance>('system');
  const [scope, setScope] = useState<Scope>('household');
  const resolved = appearance === 'system' ? (deviceScheme === 'dark' ? 'dark' : 'light') : appearance;
  const value = useMemo(() => ({ appearance, setAppearance, scope, setScope, colors: palette[resolved], resolved }), [appearance, scope, resolved]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAppTheme() {
  const context = useContext(Context);
  if (!context) throw new Error('useAppTheme requires ThemeProvider');
  return context;
}
