/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          900: '#0B3D2E',
          800: '#0F4A38',
          700: '#185C44',
          600: '#1E6B50',
          100: '#E7F2EC',
        },
        ivory: '#FAF6EC',
        cream: '#F1EAD6',
        gold: '#C9A227',
        balloon: '#E8832A',
        ink: '#1C2B26',
        muted: '#6B7A72',
        line: '#E6E0D2',
        verified: '#1E8A5A',
        reported: '#2F6DB5',
        estimated: '#C98A1B',
        unreconciled: '#C0392B',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Lora', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,61,46,.04)',
      },
      borderRadius: {
        card: '12px',
        control: '12px',
      },
      transitionDuration: {
        180: '180ms',
      },
    },
  },
  plugins: [],
}
