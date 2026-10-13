export type Appearance = 'system' | 'light' | 'dark';
export type Scope = 'household' | 'personal';

export const palette = {
  light: {
    background: '#F7F8FA', surface: '#FFFFFF', secondary: '#F0F2F4',
    text: '#17202C', muted: '#66717D', border: '#E3E7EA',
    household: '#168A73', personal: '#7654C9', tab: '#FFFFFF',
  },
  dark: {
    background: '#10151C', surface: '#1B222C', secondary: '#252E39',
    text: '#E8EDF3', muted: '#A2ADB9', border: '#303A45',
    household: '#34BFA4', personal: '#A28AE8', tab: '#1B222C',
  },
} as const;
