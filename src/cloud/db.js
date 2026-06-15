/** 微信云开发数据库入口（仅小程序端可用，环境由 App.vue 全局 init 注入） */
import { isCloudInited, isCloudFailed, waitForCloud } from '@/cloud/config.js'

export const COLLECTIONS = {
  PETS: 'pets',
  WEIGHTS: 'pet_weights',
  REMINDERS: 'pet_reminders',
  MEDICATIONS: 'pet_medications'
}

export async function getDb() {
  // #ifdef MP-WEIXIN
  // 如果云还没初始化完成，先排队等待
  if (!isCloudInited()) {
    await waitForCloud()
    if (isCloudFailed()) {
      throw new Error('云环境初始化失败')
    }
  }
  if (!wx.cloud) {
    throw new Error('wx.cloud 不可用，请确认已开通云开发')
  }
  if (!wx.cloud.database) {
    throw new Error('wx.cloud.database 不可用，云环境可能未初始化')
  }
  return wx.cloud.database()
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
