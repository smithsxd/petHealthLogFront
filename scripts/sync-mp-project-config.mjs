/**
 * 为 dist 编译产物写入微信开发者工具可用的 project.config.json
 * 不配置 cloudfunctionRoot（项目使用前端直连云数据库，无需云函数）
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const APPID = 'wxb2072e45bc057cc9'
const CLOUD_ENV_ID = 'cloud1-d7g5qwrun8a445889'

function makeProjectConfig() {
  return {
    description: `uni-app 编译产物 — 云环境 ${CLOUD_ENV_ID}`,
    packOptions: { ignore: [] },
    setting: {
      urlCheck: false,
      es6: true,
      postcss: false,
      minified: true,
      newFeature: true,
      bigPackageSizeSupport: true
    },
    compileType: 'miniprogram',
    appid: APPID,
    projectname: '毛孩子健康本',
    condition: {
      search: { current: -1, list: [] },
      conversation: { current: -1, list: [] },
      game: { current: -1, list: [] },
      miniprogram: { current: -1, list: [] }
    }
  }
}

for (const sub of ['dist/dev/mp-weixin', 'dist/build/mp-weixin']) {
  const dir = path.join(root, sub)
  if (!fs.existsSync(dir)) continue
  const configPath = path.join(dir, 'project.config.json')
  try {
    fs.writeFileSync(configPath, JSON.stringify(makeProjectConfig(), null, 2))
    console.log('[sync-mp-config] wrote', sub)
  } catch (err) {
    console.warn('[sync-mp-config] skip', sub, err.message)
  }
}
