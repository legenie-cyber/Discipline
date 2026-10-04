import { defineConfig } from 'vite'
import { readdirSync, statSync } from 'node:fs'
import { resolve, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), 'www')

// Dossiers de www/ qui ne font pas partie de l'app (brouillons, doc, composants de test)
const IGNORED = new Set(['docs', 'draft', 'todo.components', 'node_modules'])

// Application multi-pages : Vite ne compile que les pages HTML déclarées comme entrées.
// Sans cela, `vite build` n'émet que index.html et toutes les pages de views/ sont absentes de dist/
// (donc 404 dans l'app Android, alors que le serveur de dev les sert normalement).
const findPages = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return IGNORED.has(name) ? [] : findPages(full)
    return name.endsWith('.html') ? [full] : []
  })

const input = Object.fromEntries(
  findPages(root).map((file) => [relative(root, file).replace(/\.html$/, '').replace(/[\\/]/g, '_'), file])
)

export default defineConfig({
  root: 'www',
  base: './', // chemins relatifs : fonctionne à la racine https://localhost (Capacitor) comme dans un bundle OTA
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rolldownOptions: { input }, // Vite 8 (Rolldown) ; remplace build.rollupOptions, déprécié
  },
})
