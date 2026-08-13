// Runnable self-check for the e-Faktur preview arithmetic (item 9 of the fix plan).
//
// The repo has no JS test runner, so this bundles the real `app/utils/faktur.ts`
// with esbuild (already present as a Nuxt dependency) and runs the exported
// `selfCheckFakturPreview()`, which asserts that the client-side preview math
// matches the backend tax engine's rounding (ROUND_HALF_UP on integer rupiah).
//
// Run: npm run check:faktur
import { buildSync } from 'esbuild'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const entry = path.resolve(here, '../app/utils/faktur.ts')

const result = buildSync({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'silent'
})

const code = result.outputFiles[0].text
const mod = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))

mod.selfCheckFakturPreview()
console.log('faktur preview self-check: OK')
