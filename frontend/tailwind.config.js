/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ghost: {
          dark: "#0b0c10",
          lightdark: "#1f2833",
          primary: "#66fcf1",
          secondary: "#45f3ff",
          text: "#c5c6c7",
          white: "#ffffff"
        }
      }
    },
  },
  plugins: [],
}
