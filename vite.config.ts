import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';

function copyAdminIndexPlugin(): Plugin {
  return {
    name: 'copy-admin-index',
    closeBundle() {
      const distAdminHtml = path.resolve('dist/admin.html');
      const distAdminDir = path.resolve('dist/admin');
      const distAdminIndex = path.resolve('dist/admin/index.html');

      if (fs.existsSync(distAdminHtml)) {
        if (!fs.existsSync(distAdminDir)) {
          fs.mkdirSync(distAdminDir, { recursive: true });
        }
        fs.copyFileSync(distAdminHtml, distAdminIndex);
      }
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), copyAdminIndexPlugin()],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          main: path.resolve('index.html'),
          admin: path.resolve('admin.html'),
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
