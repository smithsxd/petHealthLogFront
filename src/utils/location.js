/**
 * 小程序定位 → 城市 / 区县
 *
 * wx.getLocation 只返回经纬度，不含城市名。
 * 逆地理编码需腾讯位置服务 Key（见 src/cloud/config.js → TENCENT_MAP_KEY）。
 */

import { TENCENT_MAP_KEY } from '@/cloud/config.js'

const LOCATE_TIMEOUT_MS = 8000

function normalizeCityName(city) {
  if (!city) return ''
  const s = String(city).trim()
  if (!s) return ''
  return /市$/.test(s) ? s : `${s}市`
}

function normalizeDistrictName(district) {
  if (!district) return ''
  return String(district).trim()
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} 超时`)), ms)
    })
  ])
}

async function getDeviceLocation() {
  return withTimeout(
    new Promise((resolve, reject) => {
      uni.getLocation({
        type: 'gcj02',
        success: resolve,
        fail: reject
      })
    }),
    LOCATE_TIMEOUT_MS,
    'getLocation'
  )
}

async function reverseGeocodeByTencent(latitude, longitude) {
  if (!TENCENT_MAP_KEY) {
    return { city: '', district: '' }
  }

  const location = `${latitude},${longitude}`
  const url =
    `https://apis.map.qq.com/ws/geocoder/v1/?location=${encodeURIComponent(location)}` +
    `&key=${encodeURIComponent(TENCENT_MAP_KEY)}&get_poi=0`

  const res = await withTimeout(
    new Promise((resolve, reject) => {
      uni.request({ url, method: 'GET', success: resolve, fail: reject })
    }),
    LOCATE_TIMEOUT_MS,
    'reverseGeocode'
  )

  const body = res?.data
  if (body?.status !== 0) {
    console.warn('[location] reverseGeocode status:', body?.status, body?.message)
    return { city: '', district: '' }
  }

  const comp = body?.result?.address_component || {}
  return {
    city: normalizeCityName(comp.city),
    district: normalizeDistrictName(comp.district)
  }
}

/**
 * @returns {{ city: string, district: string, located: boolean, fromCache?: boolean }}
 */
export async function resolveCityDistrictByLocation() {
  // #ifdef MP-WEIXIN
  const cached = getCachedGeo()
  if (cached?.city) {
    return { ...cached, fromCache: true, located: true }
  }

  try {
    const loc = await getDeviceLocation()
    if (TENCENT_MAP_KEY) {
      const geo = await reverseGeocodeByTencent(loc.latitude, loc.longitude)
      if (geo.city) {
        cacheGeo(geo)
        return { ...geo, located: true }
      }
    }
    return { city: '', district: '', located: false }
  } catch (err) {
    const msg = err?.errMsg || err?.message || String(err)
    console.warn('[location] locate failed:', msg)
    return { city: '', district: '', located: false }
  }
  // #endif
  // #ifndef MP-WEIXIN
  return { city: '', district: '', located: false }
  // #endif
}

const GEO_CACHE_KEY = 'pet_health_geo_city'

export function cacheGeo({ city, district }) {
  if (!city) return
  try {
    uni.setStorageSync(GEO_CACHE_KEY, {
      city: normalizeCityName(city),
      district: normalizeDistrictName(district || ''),
      ts: Date.now()
    })
  } catch (_) {}
}

export function getCachedGeo() {
  try {
    const raw = uni.getStorageSync(GEO_CACHE_KEY)
    if (!raw?.city) return null
    if (raw.ts && Date.now() - raw.ts > 7 * 24 * 3600 * 1000) return null
    return {
      city: normalizeCityName(raw.city),
      district: normalizeDistrictName(raw.district || '')
    }
  } catch (_) {
    return null
  }
}
