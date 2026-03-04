/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
        outfit: ['var(--font-outfit)', 'Outfit', 'sans-serif'],
      },
      colors: {
        'coffee-dark': '#1A0F0A',
        'coffee-mid': '#3A2A1E',
        'coffee-cream': '#E8D5B5',
        'coffee-gold': '#D4A017',
        'coffee-amber': '#A0522D',
        primary: '#1A0F0A',
        secondary: '#3A2A1E',
        accent: '#D4A017',
      },
      animation: {
        blob: 'blob 7s infinite',
        'fade-in': 'fadeIn 1s ease-in forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
      },
      keyframes: {
        blob: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
}