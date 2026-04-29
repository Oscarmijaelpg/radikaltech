/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Plus Jakarta Sans', 'sans-serif'],
            },
            colors: {
                primary: {
                    DEFAULT: 'hsl(var(--color-primary))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--color-secondary))',
                }
            }
        },
    },
    plugins: [],
}
