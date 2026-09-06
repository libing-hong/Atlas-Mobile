// Semantic palette aligned with Atlas-OS src/app/globals.css, read-only reference.
export const tokens = {
  color: {
    ink: '#102a43', muted: '#587086', primary: '#2563eb', primaryDark: '#1748b0',
    background: '#f7fbff', surface: '#ffffff', line: '#d5e3ef', soft: '#eef5fb',
    success: '#287a5f', warning: '#a45f12', danger: '#a23e45',
  },
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 12, md: 22 },
  touchTarget: 48,
} as const;
