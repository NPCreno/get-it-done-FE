import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
		animation: {
			softBounce: 'softBounce 0.6s ease-out forwards',
			fillTextLoop: 'fillText 1s ease-in-out infinite',
			fadeIn: 'fadeIn 1s ease-in-out forwards',
		  },
		  keyframes: {
			fillText: {
			  '0%': { backgroundSize: '0% 100%' },
			  '50%': { backgroundSize: '100% 100%' },
			  '100%': { backgroundSize: '0% 100%' },
			},
			fadeIn: {
			  '0%': { opacity: "0", transform: 'translateY(20px)' },
			  '100%': { opacity: "1", transform: 'translateY(0)' },
			},
		  },
  		colors: {
  			primary: {
  				'100': '#FEEAC0',
  				'200': '#FED580',
  				'300': '#FEC242',
  				'500': '#BE8202',
  				'600': '#7F5601',
  				'700': '#3F2B01',
  				default: '#FEAD03',
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				'100': '#C7E6EE',
  				'200': '#8FCEDD',
  				'300': '#59B6CD',
  				'500': '#19768D',
  				'600': '#104F5E',
  				'700': '#08272F',
  				default: '#219EBC',
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			accent: {
  				'100': '#FFDDC8',
  				'200': '#FFBC91',
  				'300': '#FF9B5C',
  				'500': '#BF5B1C',
  				'600': '#803D12',
  				'700': '#401E09',
  				default: '#FF7A25',
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			error: {
  				'100': '#FECECD',
  				'200': '#FD9D9B',
  				'300': '#FE6E6B',
  				'500': '#BE2E2B',
  				'600': '#7E1E1C',
  				'700': '#3F0F0E',
  				default: '#FD3D39'
  			},
  			success: {
				'100': '#D4F5D9',
				'200': '#A8EBB4',
				'300': '#7EE28F',
				'500': '#3EA24F',
				'600': '#296C35',
				'700': '#15361A',
				default: '#53D86A'
			},
			darkBlue: {
				'100': '#BFCBD1',
				'200': '#7F97A3',
				'300': '#406477',
				'500': '#012538',
				'600': '#021A26',
				'700': '#030F15',
				default: '#003049'
			}, 
  			warning: '#FEC242',
  			info: '#2196F3',
  			background: {
			 'light': '#EEEEEE',
			 'dark': '#0d0e12'
			},
  			text: '#333',
  			border: 'hsl(var(--border))',
  			foreground: {
				'light': '#ffffff',
				'dark': '#111317'
			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
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
  		fontFamily: {
  			lato: [
  				'Lato',
  				'sans-serif'
  			],
  			rancho: [
  				'Rancho',
  				'cursive'
  			],
  			poppins: [
  				'Poppins',
  				'sans-serif'
  			]
  		},
  		boxShadow: {
  			'primary-default': '0px 0px 10px rgba(254, 173, 3, 0.5)'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
