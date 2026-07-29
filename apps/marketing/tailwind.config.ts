import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/content/**/*.{md,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem', xl: '3rem' },
      screens: { '2xl': '1440px' },
    },
    extend: {
      colors: {
        // Brand — Nafaa Green
        brand: {
          50:'#ecfdf3',100:'#d1fadf',200:'#a6f4c5',300:'#6ce9a6',
          400:'#32d583',500:'#12b76a',600:'#039855',700:'#027a48',
          800:'#05603a',900:'#054f31',950:'#053321',
        },
        // Pakistan Heritage
        pk: {
          green:'#01411C', light:'#0d5c2d', gold:'#f4c531',
        },
        // Aurora
        aurora: {
          purple:'#8b5cf6', pink:'#ec4899', cyan:'#06b6d4',
          indigo:'#6366f1', violet:'#a855f7',
        },
        // Semantic
        sunset:'#f97316', trust:'#0284c7', gold:'#f59e0b',
        // Ink (dark-first)
        ink: {
          0:'#ffffff',50:'#fafbff',100:'#f4f6fb',200:'#e5e9f2',
          300:'#c9d0e0',400:'#8792ad',500:'#5b6785',600:'#3d4762',
          700:'#252d47',800:'#151b30',900:'#0a0e27',950:'#050716',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)','system-ui','sans-serif'],
        display: ['var(--font-satoshi)','var(--font-inter)','system-ui','sans-serif'],
        urdu: ['"Noto Nastaliq Urdu"','Gulzar','serif'],
        mono: ['var(--font-jetbrains)','ui-monospace','monospace'],
      },
      fontSize: {
        'display-2xl': ['5.5rem',{ lineHeight:'1.02', letterSpacing:'-0.04em', fontWeight:'800' }],
        'display-xl':  ['4.5rem',{ lineHeight:'1.05', letterSpacing:'-0.035em', fontWeight:'800' }],
        'display-lg':  ['3.75rem',{ lineHeight:'1.08', letterSpacing:'-0.03em', fontWeight:'800' }],
        'display-md':  ['3rem',  { lineHeight:'1.1',  letterSpacing:'-0.025em', fontWeight:'700' }],
        'display-sm':  ['2.25rem',{ lineHeight:'1.15', letterSpacing:'-0.02em', fontWeight:'700' }],
        'eyebrow':     ['0.75rem',{ lineHeight:'1.4',  letterSpacing:'0.15em', fontWeight:'700' }],
      },
      borderRadius: {
        'xs':'0.375rem','sm':'0.625rem','md':'0.875rem',
        'lg':'1.25rem','xl':'1.75rem','2xl':'2.25rem','3xl':'2.75rem',
      },
      boxShadow: {
        'brand-glow':  '0 12px 40px -8px rgba(18,183,106,0.5), 0 4px 12px rgba(18,183,106,0.3)',
        'aurora-glow': '0 12px 40px -8px rgba(139,92,246,0.5), 0 4px 12px rgba(236,72,153,0.3)',
        'gold-glow':   '0 12px 40px -8px rgba(245,158,11,0.5)',
        'sunset-glow': '0 12px 40px -8px rgba(249,115,22,0.5)',
        'card':        '0 4px 12px rgba(5,7,22,0.08), 0 2px 4px rgba(5,7,22,0.04)',
        'card-hover':  '0 12px 32px rgba(5,7,22,0.1), 0 4px 12px rgba(5,7,22,0.06)',
        'inset-sm':    'inset 0 1px 2px rgba(5,7,22,0.06)',
      },
      backgroundImage: {
        'gradient-brand':    'linear-gradient(135deg, #12b76a 0%, #039855 50%, #027a48 100%)',
        'gradient-aurora':   'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f97316 100%)',
        'gradient-pk':       'linear-gradient(135deg, #01411C 0%, #0d5c2d 50%, #12b76a 100%)',
        'gradient-sunset':   'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
        'gradient-ocean':    'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
        'gradient-text':     'linear-gradient(120deg, #12b76a 0%, #06b6d4 50%, #8b5cf6 100%)',
        'gradient-text-aurora':'linear-gradient(120deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)',
        'gradient-text-gold':'linear-gradient(120deg, #f59e0b 0%, #f97316 100%)',
        'mesh-light':        'radial-gradient(at 20% 20%, rgba(18,183,106,0.15) 0%, transparent 50%), radial-gradient(at 80% 10%, rgba(139,92,246,0.15) 0%, transparent 50%), radial-gradient(at 50% 90%, rgba(236,72,153,0.15) 0%, transparent 50%)',
        'mesh-dark':         'radial-gradient(at 20% 20%, rgba(18,183,106,0.18) 0%, transparent 50%), radial-gradient(at 80% 10%, rgba(139,92,246,0.18) 0%, transparent 50%), radial-gradient(at 50% 90%, rgba(236,72,153,0.15) 0%, transparent 50%)',
        'noise':             "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")",
      },
      animation: {
        'aurora-float': 'auroraFloat 12s ease-in-out infinite',
        'aurora-drift': 'auroraDrift 20s ease-in-out infinite',
        'shimmer':      'shimmer 6s linear infinite',
        'pulse-glow':   'pulseGlow 3s ease-in-out infinite',
        'scroll-x':     'scrollX 40s linear infinite',
        'ticker':       'ticker 30s linear infinite',
        'blob':         'blob 20s ease-in-out infinite',
        'grid-move':    'gridMove 20s linear infinite',
        'orbit':        'orbit 20s linear infinite',
        'gradient-x':   'gradientX 8s ease infinite',
      },
      keyframes: {
        auroraFloat: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%':      { transform: 'translate(20px, -30px) scale(1.05)' },
        },
        auroraDrift: {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '33%':      { transform: 'translate(30px, -20px) rotate(2deg)' },
          '66%':      { transform: 'translate(-20px, 20px) rotate(-2deg)' },
        },
        shimmer: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%':      { opacity: '0.8', transform: 'scale(1.05)' },
        },
        scrollX: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        ticker: {
          '0%':   { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        blob: {
          '0%, 100%':  { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
          '50%':       { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' },
        },
        gridMove: {
          '0%':   { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '80px 80px' },
        },
        orbit: {
          '0%':   { transform: 'rotate(0deg) translateX(50px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(50px) rotate(-360deg)' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
      },
      transitionTimingFunction: {
        'out-expo':  'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out-quart': 'cubic-bezier(0.65, 0, 0.35, 1)',
        'smooth':    'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
};

export default config;
