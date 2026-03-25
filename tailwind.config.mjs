import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    theme: {
        extend: {
            colors: {
                black: '#0a0a0a',
                white: '#ffffff',
                gray: {
                    100: '#f5f5f5',
                    200: '#e5e5e5',
                    300: '#d4d4d4',
                    400: '#a3a3a3',
                    500: '#737373',
                    600: '#525252',
                    700: '#404040',
                    800: '#262626',
                    900: '#171717',
                },
                accent: {
                    DEFAULT: '#8b0029',
                    dim: '#6d001f',
                    light: '#b8003a',
                    pale: '#ffeef3',
                },
            },
            fontFamily: {
                display: ['var(--font-display)', 'serif'],
                mono: ['var(--font-mono)', 'monospace'],
                body: ['var(--font-body)', 'sans-serif'],
            },
        },
    },
    plugins: [typography],
};
