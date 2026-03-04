export const theme = {
  colors: {
    primary: {
      DEFAULT: '#3A2A1E',
      dark: '#1A0F0A',
      light: '#5C4033',
      lighter: '#8B6B4D',
      darker: '#0D0705',
    },
    secondary: {
      DEFAULT: '#E8D5B5',
      light: '#F5EBDC',
      dark: '#D1C4A3',
      lighter: '#FDF7EF',
      darker: '#B9AC8D',
    },
    accent: {
      gold: {
        DEFAULT: '#D4A017',
        light: '#E8C34A',
        dark: '#A77B06',
      },
      amber: {
        DEFAULT: '#A0522D',
        light: '#C6744F',
        dark: '#7A3E22',
      },
      blue: {
        DEFAULT: '#3A5FCD',
        light: '#6B8CFF',
        dark: '#1E40AF',
      },
      copper: {
        DEFAULT: '#B87333',
        light: '#D4915C',
        dark: '#8B571F',
      },
    },
    neutral: {
      white: '#FFFFFF',
      lightGray: '#E5E7EB',
      mediumGray: '#9CA3AF',
      darkGray: '#4B5563',
      black: '#111827',
      extraLightGray: '#F3F4F6',
      charcoal: '#1F2937',
    },
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
  },
  shadows: {
    coffeeGlow: '0 4px 15px rgba(212, 160, 23, 0.3)',
    cardHover: '0 0 25px rgba(212, 160, 23, 0.5)',
    subtle: '0 2px 8px rgba(0, 0, 0, 0.1)',
    medium: '0 4px 12px rgba(0, 0, 0, 0.15)',
    elevated: '0 8px 24px rgba(0, 0, 0, 0.2)',
    inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
    sharpEdge: '4px 4px 0px rgba(0, 0, 0, 0.2)',
    glowAccent: '0 0 20px rgba(184, 115, 51, 0.4)',
  },
  typography: {
    fontFamily: {
      heading: ['Poppins', 'sans-serif'],
      body: ['Roboto', 'sans-serif'], // Roboto'yu metinler için ekledik
      mono: ['Source Code Pro', 'monospace'],
    },
    fontSize: {
      xs: '0.75rem',   // 12px
      sm: '0.875rem',  // 14px
      base: '1rem',    // 16px
      lg: '1.125rem',  // 18px
      xl: '1.25rem',   // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
      '5xl': '3rem',     // 48px
      '6xl': '4rem',     // 64px
      '7xl': '5rem',     // 80px
      '8xl': '6rem',     // 96px
    },
    lineHeight: {
      tight: '1.2',
      normal: '1.5',
      relaxed: '1.75',
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    letterSpacing: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
    },
  },
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '6rem',
    '5xl': '8rem',
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.75rem',
    lg: '1rem',
    full: '9999px',
    xs: '0.25rem',
    xl: '1.5rem',
    '2xl': '2rem',
  },
};