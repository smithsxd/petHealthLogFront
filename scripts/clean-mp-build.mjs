import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** 主包根目录残留的 echarts（历史构建产物，约 1MB，会导致主包超 1.5M） */
const staleFiles = [
  path.join(root, 'dist/build/mp-weixin/static/echarts.min.js'),
  path.join(root, 'dist/dev/mp-weixin/static/echarts.min.js'),
  path.join(root, 'dist/build/mp-weixin/utils/echarts.mp.js'),
  path.join(root, 'dist/dev/mp-weixin/utils/echarts.mp.js'),
  path.join(root, 'dist/build/mp-weixin/uni_modules'),
  path.join(root, 'dist/dev/mp-weixin/uni_modules')
]

// 主包禁止出现 src/static/echarts.min.js（约 1MB）
const forbiddenSrc = path.join(root, 'src/static/echarts.min.js')
if (fs.existsSync(forbiddenSrc)) {
  console.warn('[clean] 警告: 请删除 src/static/echarts.min.js，echarts 应仅放在 pages/weight/static/（分包）')
}

for (const file of staleFiles) {
  if (!fs.existsSync(file)) continue
  try {
    fs.rmSync(file, { recursive: true, force: true })
    console.log('[clean] removed', path.relative(root, file))
  } catch (err) {
    console.warn('[clean] skip (file in use):', path.relative(root, file))
  }
}
