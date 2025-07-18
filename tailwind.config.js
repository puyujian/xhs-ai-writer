/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		// ======================================================================
  		// ========================= 核心优化点在这里 =========================
  		// ======================================================================
  		typography: (theme) => ({
  			pink: {
  				css: {
  					'--tw-prose-body': theme('colors.gray[800]'),
  					'--tw-prose-headings': theme('colors.gray[900]'),
  					'--tw-prose-lead': theme('colors.pink[700]'),
  					'--tw-prose-links': theme('colors.pink[900]'),
  					'--tw-prose-bold': theme('colors.pink[600]'),
  					'--tw-prose-counters': theme('colors.pink[600]'),
  					'--tw-prose-bullets': theme('colors.pink[400]'),

  					// 自定义列表项的Emoji，彻底解决美观问题
  					'ul > li::before': {
  						content: "'✨'",
  						marginRight: '0.5em',
  						color: theme('colors.pink[400]'),
  					},
  					// 确保列表项没有默认的 disc 样式
  					'ul > li': {
  						paddingLeft: '0',
  					},
  					'ul > li > p': {
  						margin: '0',
  					},
  				},
  			},
  		}),
  	}
  },
  // 将插件添加到 plugins 数组中
  plugins: [
  	require("tailwindcss-animate"),
  	require("@tailwindcss/typography") // <--- 新增这一行
  ],
}
