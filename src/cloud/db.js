/** 微信云开发数据库入口（仅小程序端可用，环境由 App.vue 全局 init 注入） */
import { CLOUD_ENV_ID, isCloudInited, isCloudFailed, waitForCloud, ensureCloud } from '@/cloud/config.js'

export const COLLECTIONS = {
  PETS: 'pets',
  WEIGHTS: 'pet_weights',
  REMINDERS: 'pet_reminders',
  MEDICATIONS: 'pet_medications',
  REVIEWS: 'hospital_reviews'
}

export async function getDb() {
  // #ifdef MP-WEIXIN
  if (!isCloudInited()) {
    await waitForCloud()
    if (isCloudFailed()) {
      throw new Error('云环境初始化失败，请重启小程序')
    }
  }
  ensureCloud()
  if (!wx.cloud.database) {
    throw new Error('wx.cloud.database 不可用，云环境可能未初始化')
  }
  // 显式指定 env，避免开发者工具选错环境导致 -501000
  return wx.cloud.database({ env: CLOUD_ENV_ID })
  // #endif
  // #ifndef MP-WEIXIN
  throw new Error('云数据库仅支持微信小程序')
  // #endif
}

export function isCloudReady() {
  // #ifdef MP-WEIXIN
  return isCloudInited() && !isCloudFailed() && !!wx.cloud && !!wx.cloud.database
  // #endif
  // #ifndef MP-WEIXIN
  return false
  // #endif
}
