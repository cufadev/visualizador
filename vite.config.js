import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// viteSingleFile deja todo (JS, CSS, fuentes) dentro de un unico index.html en dist/,
// para poder abrirlo offline desde un pendrive o la notebook de la banda.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: { target: 'es2020', chunkSizeWarningLimit: 4000 },
});
