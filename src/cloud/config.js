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
