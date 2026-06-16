/**
 * 将 dist/build/mp-weixin 同步到 dist/dev/mp-weixin
 * 避免开发者工具打开 dev 目录时跑的是过期代码
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'dist/build/mp-weixin')
const dest = path.join(root, 'dist/dev/mp-weixin')

if (!fs.existsSync(src)) {
  console.warn('[sync-dev] build output missing, skip')
  process.exit(0)
}

fs.rmSync(dest, { recursive: true, force: true })
fs.cpSync(src, dest, { recursive: true })
console.log('[sync-dev] copied build → dev')
