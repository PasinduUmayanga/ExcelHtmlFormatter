import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

// The shared @hf/* packages are devDependencies on purpose: electron-vite bundles devDependencies
// into the app, and only keeps real `dependencies` (here just exceljs) as files loaded at runtime.
// electron-builder then ships only those runtime dependencies in the installer.
export default defineConfig({
  main: {
    build: {
      rollupOptions: { input: { main: resolve(__dirname, 'src/main/main.ts') } }
    }
  },
  preload: {
    build: {
      rollupOptions: { input: { preload: resolve(__dirname, 'src/preload/preload.ts') } }
    }
  },
  renderer: {
    root: '.',
    plugins: [react()],
    // One copy of each, even though several workspace packages depend on them.
    resolve: { dedupe: ['react', 'react-dom', 'zustand', '@tanstack/react-router'] },
    build: {
      rollupOptions: { input: resolve(__dirname, 'index.html') }
    }
  }
})
