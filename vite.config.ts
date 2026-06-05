import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { execSync } from 'child_process'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

let commitHash = 'dev'
try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim()
} catch { /* not a git repo or git unavailable */ }

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Comma-separated list of hostnames allowed to access the dev server
  const allowedHosts = (env.VITE_ALLOWED_HOSTS || '')
    .split(',')
    .map(h => h.trim())
    .filter(Boolean)

  return {
    base: env.VITE_BASE_PATH || '/',
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __COMMIT_HASH__: JSON.stringify(commitHash),
    },
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler']],
        },
      }),
    ],
    server: {
      port: 9092,
      host: true,
      allowedHosts,
    }
  }
})
