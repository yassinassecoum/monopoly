import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    host: true, // accessible depuis les autres appareils du même Wi-Fi
    proxy: {
      // En développement, Vite relaie les connexions temps réel vers le serveur Node
      '/socket.io': { target: 'http://localhost:3001', ws: true },
    },
  },
});
