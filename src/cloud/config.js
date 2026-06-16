/**
 * 微信云开发环境 ID（全局唯一配置）
 *
 * 请在微信开发者工具 → 云开发 → 设置 中复制「环境 ID」。
 * - 若控制台显示完整 ID（如 cloud1-4g3abcdf），请替换下方占位符。
 * - 仅写别名 cloud1 时，须确保该小程序 AppID 已绑定该云环境。
 *
 * 报错 -501000 Env Not Exists 时，优先检查：
 * 1. manifest.json → mp-weixin.appid 是否为正式 AppID（非空、非游客）
 * 2. 此处环境 ID 是否与云控制台一致
 */
export const CLOUD_ENV_ID = 'cloud1-d7g5qwrun8a445889'

/**
 * 腾讯位置服务 Key（可选）
 * 配置后可通过定位自动解析城市 / 区县。
 * 申请：https://lbs.qq.com/ → 小程序 → WebServiceAPI
 * 并在微信公众平台 → 开发设置 → 服务器域名 添加 https://apis.map.qq.com
 */
export const TENCENT_MAP_KEY = 'RUIBZ-4SULG-UK6QK-QGTWF-VBQY7-PDFOJ'

// ---- 云初始化就绪锁 ----
// 微信小程序 App.onLaunch 不会被框架 await，页面可能在 init 完成前就开始渲染。
// 这里用 Promise 让所有数据库操作排队，等 init 完成后再放行。

let _resolveCloud = null
let _cloudRejected = false

const _cloudPromise = new Promise((resolve) => {
  _resolveCloud = resolve
})

// 兜底：超时后标记失败，避免未 init 就发起数据库请求
setTimeout(() => {
  if (_resolveCloud) {
    console.error('[cloud] 初始化等待超时（10s），请检查云开发与 AppID')
    _cloudRejected = true
    _resolveCloud()
    _resolveCloud = null
  }
}, 10000)

export function waitForCloud() {
  return _cloudPromise
}

export function isCloudInited() {
  return _resolveCloud === null
}

export function setCloudInited(error) {
  if (_resolveCloud) {
    if (error) {
      _cloudRejected = true
    }
    _resolveCloud()
    _resolveCloud = null
  }
}

export function isCloudFailed() {
  return _cloudRejected
}

/** 统一云初始化（幂等），所有云 API 调用前应执行 */
export function ensureCloud() {
  // #ifdef MP-WEIXIN
  if (!wx.cloud) {
    throw new Error('wx.cloud 不可用，请确认已开通云开发且 AppID 正确')
  }
  wx.cloud.init({ env: CLOUD_ENV_ID, traceUser: true })
  return CLOUD_ENV_ID
  // #endif
  // #ifndef MP-WEIXIN
  throw new Error('云开发仅支持微信小程序')
  // #endif
}

/** cloud:// fileID 是否属于当前配置的云环境 */
export function isCloudFileForCurrentEnv(fileId) {
  if (!fileId || typeof fileId !== 'string') return false
  if (!fileId.startsWith('cloud://')) return false
  const envKey = CLOUD_ENV_ID.replace(/^cloud1-/, '')
  return fileId.includes(CLOUD_ENV_ID) || (envKey && fileId.includes(envKey))
}
