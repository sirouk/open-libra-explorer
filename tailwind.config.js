/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                libra: {
                    coral: '#FF6E4A',     // coral salmon main color
                    light: '#FF8F73',     // lighter shade
                    dark: '#E64E2A',      // darker shade
                    bg: '#F9F9F9',        // background color
                    text: '#333333',      // text color
                    accent: '#0066CC',    // accent color for contrast
                },
            },
        },
    },
    plugins: [],
} 