/** 当前用户 OpenID 缓存（无需云函数） */

export const OPENID_STORAGE_KEY = 'pet_health_openid'

export function cacheOpenId(openid) {
  if (!openid) return
  try {
    uni.setStorageSync(OPENID_STORAGE_KEY, openid)
  } catch (_) {}
}

export function getCachedOpenId() {
  try {
    return uni.getStorageSync(OPENID_STORAGE_KEY) || ''
  } catch (_) {
    return ''
  }
}
