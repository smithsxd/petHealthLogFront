/** 微信云开发数据库入口（仅小程序端可用，环境由 App.vue 全局 init 注入） */
export const COLLECTIONS = {
  PETS: 'pets',
  WEIGHTS: 'pet_weights',
  REMINDERS: 'pet_reminders',
  MEDICATIONS: 'pet_medications'
}

export function getDb() {
  // #ifdef MP-WEIXIN
  if (!wx.cloud) {
    throw new Error('wx.cloud 不可用，请确认已开通云开发')
  }
  return wx.cloud.database()
  // #endif
  // #ifndef MP-WEIXIN
  throw new Error('云数据库仅支持微信小程序')
  // #endif
}

export function isCloudReady() {
  // #ifdef MP-WEIXIN
  return !!wx.cloud
  // #endif
  // #ifndef MP-WEIXIN
  return false
  // #endif
}
