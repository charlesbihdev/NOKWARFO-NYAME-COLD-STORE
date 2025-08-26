import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            ssr: 'resources/js/ssr.jsx',
            refresh: true,
            valetTls: false, // DISABLE Herd / Valet SSL detection
        }),
        react(),
        tailwindcss(),
    ],
    server: {
        host: '127.0.0.1',   // Force localhost
        port: 5173,
        https: false,        // Disable SSL
        strictPort: true,
        origin: 'http://127.0.0.1:5173', // Ensure asset URLs use localhost
        cors: {
            origin: 'http://127.0.0.1:8000',
            credentials: true,
        }
    },
    clearScreen: false
});
