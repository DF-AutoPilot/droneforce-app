// Theme constants for DroneForce App
// This file defines consistent styling values that can be used throughout the app

export const colors = {
  // Base
  white: '#FFFFFF',
  black: '#000000',
  
  // Background
  bgPrimary: '#050505', // deepest background
  bgSecondary: '#121212', // slightly lighter background
  bgTertiary: '#1E1E1E', // lightest background for inputs, cards, etc.
  bgGradientFrom: '#050505', // from-neutral-950
  bgGradientTo: '#171717', // to-neutral-900
  
  // Text
  textPrimary: '#FFFFFF', // main text color
  textSecondary: '#A1A1AA', // secondary text, labels, etc.
  textMuted: '#71717A', // muted text, placeholders
  
  // Borders & Dividers
  borderPrimary: '#262626', // main border color
  borderSecondary: '#404040', // slightly lighter border
  
  // Actions & States
  accent: '#3B82F6', // blue-500 primary accent
  success: '#22C55E', // green-500
  warning: '#EAB308', // yellow-500
  error: '#EF4444', // red-500
  info: '#06B6D4', // cyan-500
  
  // Status colors (task states)
  statusCreated: '#3B82F6', // blue-500
  statusAccepted: '#EAB308', // yellow-500 
  statusCompleted: '#A855F7', // purple-500
  statusVerified: '#22C55E', // green-500
};

export const spacing = {
  xs: '0.25rem',  // 4px
  sm: '0.5rem',   // 8px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  '2xl': '2.5rem' // 40px
};

export const borderRadius = {
  sm: '0.125rem', // 2px
  md: '0.25rem',  // 4px
  lg: '0.5rem',   // 8px
  xl: '0.75rem',  // 12px
  '2xl': '1rem',  // 16px
  full: '9999px', // Circle/pill
};

export const fontSizes = {
  xs: '0.75rem',  // 12px
  sm: '0.875rem', // 14px
  md: '1rem',     // 16px
  lg: '1.125rem', // 18px
  xl: '1.25rem',  // 20px
  '2xl': '1.5rem' // 24px
};

export const fontWeights = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700
};

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
};

export const transitions = {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms'
};

// Common component styles that can be reused
export const componentStyles = {
  // Card styles
  card: {
    background: 'bg-neutral-950/80 backdrop-blur-sm',
    border: 'border border-neutral-800',
  },
  
  // Button styles
  button: {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-neutral-800 hover:bg-neutral-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    subtle: 'bg-neutral-800/50 hover:bg-neutral-700/50 text-neutral-200',
  },
  
  // Input styles
  input: {
    background: 'bg-neutral-900',
    border: 'border-neutral-800',
    text: 'text-white',
    placeholder: 'placeholder:text-neutral-500',
    focus: 'focus:border-blue-600 focus:ring-blue-600/20',
  }
};

// Defines consistent padding/margin values for different container sizes
export const containers = {
  page: 'py-12 px-4',
  content: 'max-w-6xl mx-auto',
  section: 'mb-8',
};

// Export all as default
const theme = {
  colors,
  spacing,
  borderRadius,
  fontSizes,
  fontWeights,
  shadows,
  transitions,
  componentStyles,
  containers
};

export default theme;
