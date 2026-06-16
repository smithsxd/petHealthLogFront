/**
 * 小程序定位 → 城市 / 区县
 *
 * wx.getLocation 只返回经纬度，不含城市名。
 * 逆地理编码需腾讯位置服务 Key（见 src/cloud/config.js → TENCENT_MAP_KEY）。
 */

import { TENCENT_MAP_KEY } from '@/cloud/config.js'
import { formatLocateError } from '@/utils/reviewConstants.js'

const LOCATE_TIMEOUT_MS = 10000
const LOCATION_ASKED_KEY = 'pet_health_location_asked'
const GEO_FAIL_DEBOUNCE_MS = 30 * 1000

let _inflightGeo = null
let _launchPrefetchPromise = null
let _isFirstAppShow = true
let _recentFailResult = null
let _recentFailUntil = 0

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

/** 查询当前是否已授权位置 */
export function getLocationAuthStatus() {
  return new Promise((resolve) => {
    uni.getSetting({
      success: (res) => {
        const auth = res?.authSetting?.['scope.userLocation']
        if (auth === true) resolve('granted')
        else if (auth === false) resolve('denied')
        else resolve('unknown')
      },
      fail: () => resolve('unknown')
    })
  })
}

/** 查询定位授权；首次系统弹窗交给 getLocation 触发，生产版更稳定 */
export function requestLocationPermission() {
  return new Promise((resolve) => {
    uni.getSetting({
      success: (res) => {
        const auth = res?.authSetting?.['scope.userLocation']
        if (auth === true) {
          resolve({ granted: true })
          return
        }
        if (auth === false) {
          resolve({ granted: false, denied: true })
          return
        }
        resolve({ granted: true, needsSystemPrompt: true })
      },
      fail: () => resolve({ granted: false })
    })
  })
}

/**
 * 小程序启动时：先说明用途，再请求授权（仅首次弹自定义说明）
 */
export function promptLocationPermissionOnLaunch() {
  // #ifdef MP-WEIXIN
  return new Promise((resolve) => {
    try {
      const asked = uni.getStorageSync(LOCATION_ASKED_KEY)
      if (asked) {
        requestLocationPermission().then(resolve)
        return
      }
      uni.showModal({
        title: '开启定位服务',
        content: '用于自动识别您所在城市，展示同城就医指南。您也可稍后在发布页手动选择城市。',
        confirmText: '允许定位',
        cancelText: '暂不',
        success: (res) => {
          uni.setStorageSync(LOCATION_ASKED_KEY, true)
          if (res.confirm) {
            resolve({ granted: true, needsSystemPrompt: true })
          } else {
            resolve({ granted: false, skipped: true })
          }
        },
        fail: () => resolve({ granted: false })
      })
    } catch (_) {
      resolve({ granted: false })
    }
  })
  // #endif
  // #ifndef MP-WEIXIN
  return Promise.resolve({ granted: false })
  // #endif
}

/** 打开设置页，供用户手动开启位置权限 */
export function openLocationSettings() {
  return new Promise((resolve) => {
    uni.openSetting({
      success: (res) => {
        resolve(!!res?.authSetting?.['scope.userLocation'])
      },
      fail: () => resolve(false)
    })
  })
}

async function ensureLocationPermission() {
  const status = await getLocationAuthStatus()
  if (status === 'granted') return { ok: true }
  if (status === 'denied') {
    return {
      ok: false,
      errorMessage: '您已拒绝位置权限。请点击「去设置」或在手机 设置→微信→位置 中允许'
    }
  }
  // unknown 时直接进入 getLocation，由微信系统弹出正式授权框。
  return { ok: true }
}

async function getDeviceLocation() {
  const perm = await ensureLocationPermission()
  if (!perm.ok) {
    const err = new Error(perm.errorMessage)
    err.needOpenSetting = /拒绝|设置/.test(perm.errorMessage)
    throw err
  }

  return withTimeout(
    new Promise((resolve, reject) => {
      uni.getLocation({
        type: 'gcj02',
        isHighAccuracy: true,
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
    return { city: '', district: '', errorCode: 0, errorMessage: '未配置地图 Key' }
  }

  const location = `${latitude},${longitude}`
  const url =
    `https://apis.map.qq.com/ws/geocoder/v1/?location=${encodeURIComponent(location)}` +
    `&key=${encodeURIComponent(TENCENT_MAP_KEY)}&get_poi=0&coord_type=5&output=json`

  let res
  try {
    res = await withTimeout(
      new Promise((resolve, reject) => {
        uni.request({ url, method: 'GET', success: resolve, fail: reject })
      }),
      LOCATE_TIMEOUT_MS,
      'reverseGeocode'
    )
  } catch (err) {
    const msg = err?.errMsg || err?.message || '网络请求失败'
    console.warn('[location] reverseGeocode request failed:', msg)
    const isDomain = /domain|url|合法|不在/i.test(msg)
    return {
      city: '',
      district: '',
      errorCode: -1,
      errorMessage: isDomain
        ? '请在微信公众平台配置 request 合法域名：https://apis.map.qq.com'
        : msg
    }
  }

  const body = res?.data
  console.log('[location] geocoder response status:', body?.status, body?.message || '')

  if (body?.status !== 0) {
    const hint = formatLocateError(body?.status, body?.message)
    return { city: '', district: '', errorCode: body?.status, errorMessage: hint }
  }

  const comp = body?.result?.address_component || {}
  return {
    city: normalizeCityName(comp.city),
    district: normalizeDistrictName(comp.district),
    errorCode: 0,
    errorMessage: ''
  }
}

/**
 * @param {{ force?: boolean }} options - force=true 时跳过缓存重新定位（用户点「重新定位」）
 */
export async function resolveCityDistrictByLocation({ force = false } = {}) {
  // #ifdef MP-WEIXIN
  if (force) {
    clearGeoFailCache()
  }

  const cached = getCachedGeo()
  if (cached?.city && !force) {
    return { ...cached, fromCache: true, located: true, errorCode: 0, errorMessage: '' }
  }

  const recentFail = getRecentGeoFail()
  if (recentFail && !force) {
    return recentFail
  }

  if (_inflightGeo && !force) {
    return _inflightGeo
  }

  const run = (async () => {
    try {
      console.log('[location] start locate, force=', force)
      const loc = await getDeviceLocation()
      console.log('[location] got coords:', loc.latitude, loc.longitude)

      if (!TENCENT_MAP_KEY) {
        return { city: '', district: '', located: false, errorCode: 0, errorMessage: '未配置地图 Key' }
      }

      const geo = await reverseGeocodeByTencent(loc.latitude, loc.longitude)
      if (geo.city) {
        clearGeoFailCache()
        cacheGeo(geo)
        const result = { ...geo, located: true, fromCache: false }
        emitGeoCityReady(result)
        return result
      }

      cacheGeoFail(geo)
      const failed = {
        city: '',
        district: '',
        located: false,
        fromCache: false,
        errorCode: geo.errorCode,
        errorMessage: geo.errorMessage || formatLocateError(geo.errorCode)
      }
      return failed
    } catch (err) {
      const msg = err?.errMsg || err?.message || String(err)
      console.warn('[location] locate failed:', msg)
      const isAuth = err?.needOpenSetting || /auth|deny|authorize|permission|拒绝/i.test(msg)
      // 权限类错误不写入失败缓存，避免误伤后续重试
      return {
        city: '',
        district: '',
        located: false,
        fromCache: false,
        errorCode: isAuth ? -2 : -1,
        errorMessage: isAuth
          ? msg || '未授权位置权限，请在手机设置中允许微信使用位置'
          : msg,
        needOpenSetting: !!err?.needOpenSetting
      }
    } finally {
      if (_inflightGeo === run) {
        _inflightGeo = null
      }
    }
  })()

  _inflightGeo = run
  return run
  // #endif
  // #ifndef MP-WEIXIN
  return { city: '', district: '', located: false, errorCode: 0, errorMessage: '' }
  // #endif
}

/** 定位成功后通知各页面更新城市筛选（如就医指南） */
function emitGeoCityReady(geo) {
  if (!geo?.city) return
  try {
    uni.$emit('geo-city-ready', {
      city: normalizeCityName(geo.city),
      district: normalizeDistrictName(geo.district || '')
    })
  } catch (_) {}
}

/**
 * 小程序启动：询问位置权限，用户允许后立即预定位并缓存城市
 * 供就医指南等页面进入时直接使用，无需等到发布页再定位
 */
export function prefetchLocationOnLaunch() {
  // #ifdef MP-WEIXIN
  if (_launchPrefetchPromise) {
    return _launchPrefetchPromise
  }
  _launchPrefetchPromise = promptLocationPermissionOnLaunch().then(async (perm) => {
    console.log('[location] launch permission:', perm)
    if (!perm.granted) {
      return { city: '', district: '', located: false, permission: perm }
    }
    clearGeoFailCache()
    const geo = await resolveCityDistrictByLocation({ force: false })
    console.log('[location] launch prefetch:', geo.city || '(failed)', geo.errorMessage || '')
    return geo
  })
  return _launchPrefetchPromise
  // #endif
  // #ifndef MP-WEIXIN
  return Promise.resolve({ city: '', district: '', located: false })
  // #endif
}

/**
 * 从后台回到前台时补定位（跳过冷启动那次 onShow，避免与 onLaunch 重复抢定位）
 */
export function tryPrefetchLocationOnShow() {
  // #ifdef MP-WEIXIN
  if (_isFirstAppShow) {
    _isFirstAppShow = false
    return Promise.resolve({ city: '', district: '', located: false, skipped: true })
  }
  if (getCachedGeo()?.city) {
    const cached = getCachedGeo()
    return Promise.resolve({ ...cached, located: true, fromCache: true })
  }
  if (_launchPrefetchPromise) {
    return _launchPrefetchPromise.then((geo) => {
      if (geo?.city) return geo
      return resolveCityDistrictByLocation({ force: false })
    })
  }
  return getLocationAuthStatus().then((status) => {
    if (status !== 'granted') {
      return { city: '', district: '', located: false }
    }
    clearGeoFailCache()
    return resolveCityDistrictByLocation({ force: false }).then((geo) => {
      console.log('[location] show prefetch:', geo.city || '(failed)', geo.errorMessage || '')
      return geo
    })
  })
  // #endif
  // #ifndef MP-WEIXIN
  return Promise.resolve({ city: '', district: '', located: false })
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

function cacheGeoFail({ errorCode, errorMessage }) {
  _recentFailResult = {
    city: '',
    district: '',
    located: false,
    fromCache: false,
    errorCode,
    errorMessage
  }
  _recentFailUntil = Date.now() + GEO_FAIL_DEBOUNCE_MS
}

function getRecentGeoFail() {
  if (!_recentFailResult || Date.now() > _recentFailUntil) {
    _recentFailResult = null
    return null
  }
  return _recentFailResult
}

function clearGeoFailCache() {
  _recentFailResult = null
  _recentFailUntil = 0
  try {
    uni.removeStorageSync('pet_health_geo_fail')
  } catch (_) {}
}

/** 清除定位缓存（调试用） */
export function clearGeoCache() {
  try {
    uni.removeStorageSync(GEO_CACHE_KEY)
  } catch (_) {}
  clearGeoFailCache()
}
