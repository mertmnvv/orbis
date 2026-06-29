const dark = {
  bg: {
    base:     '#0a0a0a',
    surface:  '#141414',
    elevated: '#1e1e1e',
    card:     'rgba(255,255,255,0.03)',
  },
  border: {
    DEFAULT: 'rgba(255,255,255,0.07)',
    subtle:  'rgba(255,255,255,0.05)',
    muted:   '#2a2a2a',
  },
  text: {
    primary:   '#ffffff',
    secondary: '#a1a1aa',
    muted:     '#52525b',
    faint:     '#3f3f46',
  },
};


export type AppTheme = typeof dark;

export function useTheme(): { colors: AppTheme; isDark: boolean } {
  return { colors: dark, isDark: true };
}
