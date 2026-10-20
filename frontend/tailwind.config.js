/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aegis: {
          void: '#06080B',
          carbon: '#0A0D12',
          chassis: '#0F141C',
          panel: '#161D27',
          border: '#243042',
          borderLight: '#3B494C',
          cyan: '#00E5FF',
          cyanDim: 'rgba(0, 229, 255, 0.15)',
          emerald: '#00FF88',
          emeraldDim: 'rgba(0, 255, 136, 0.15)',
          amber: '#FFB703',
          amberDim: 'rgba(255, 183, 3, 0.15)',
          ruby: '#FF1E56',
          rubyDim: 'rgba(255, 30, 86, 0.15)',
          muted: '#5D728E',
          text: '#E6EDF5'
        },
        tactical: {
          darkest: '#06080B',
          dark: '#0A0D12',
          panel: '#0F141C',
          panelBorder: '#243042',
          subtle: '#5D728E'
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
