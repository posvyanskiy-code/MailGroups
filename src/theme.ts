// Neutral, hairline-driven design system inspired by Stripe / Linear / Vercel.
// Lots of whitespace, soft surfaces, restrained accent. No extruded shadows.

export const colors = {
  // Surfaces
  surface: '#FAFAFA',          // app background
  surfaceRaised: '#FFFFFF',     // cards, modals, header
  surfaceMuted: '#F4F4F5',      // hover, code, soft fill
  border: '#E4E4E7',            // hairline
  borderStrong: '#D4D4D8',
  divider: '#F0F0F0',

  // Text
  text: '#09090B',
  textMuted: '#71717A',
  textSubtle: '#A1A1AA',

  // Brand — single restrained accent
  primary: '#5B57E0',
  primaryHover: '#4F4BCB',
  primaryActive: '#403CB0',
  primarySoft: '#F1F0FE',

  // Status
  success: '#15803D',
  successSoft: '#ECFDF5',
  warning: '#A16207',
  warningSoft: '#FEF9C3',
  danger: '#B91C1C',
  dangerSoft: '#FEF2F2',
}

export const radii = { sm: 6, md: 8, lg: 10, pill: 9999 }

export const fonts = {
  body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI Variable", "Segoe UI", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
}

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 }

export const shadow = {
  card: '0 1px 0 rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04)',
  popover: '0 8px 24px rgba(0,0,0,0.08)',
}
