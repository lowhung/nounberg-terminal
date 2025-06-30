import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    define: {
        global: 'globalThis',
    },
    resolve: {
        alias: {
            buffer: 'buffer',
        }
    },
    optimizeDeps: {
        include: ['buffer']
    },
    server: {
        port: 8080,
        host: true,
    },
    preview: {
        port: 8080,
        host: true,
    }
})
