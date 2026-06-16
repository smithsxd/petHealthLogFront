import { isCloudFileForCurrentEnv } from '@/cloud/config.js'
import { normalizeListType, listTypeMatches } from '@/utils/reviewConstants.js'

/** 验单图片地址是否可用于 <image> 渲染 */
export function isValidReceiptSrc(src) {
  if (!src || typeof src !== 'string') return false
  const s = src.trim()
  if (!s) return false
  if (s.startsWith('cloud://')) {
    // 跨环境 fileID 会触发 Env Not Exists，直接过滤
    return isCloudFileForCurrentEnv(s)
  }
  return s.startsWith('https://') || s.startsWith('http://') || s.startsWith('wxfile://')
}

/** 从文档提取可排序的时间戳（兼容多种字段） */
export function getReviewTimestamp(doc) {
  if (!doc) return 0
  const raw =
    doc.createTime ??
    doc.create_time ??
    doc._createTime ??
    doc._updateTime ??
    doc.created_at ??
    0
  if (typeof raw === 'object' && raw?.getTime) return raw.getTime()
  const n = Number(raw)
  // 秒级时间戳转毫秒
  if (n > 0 && n < 1e12) return n * 1000
  return n || 0
}

/** 云库排序字段（与库内 createTime 一致；兼容旧数据 create_time） */
export const REVIEW_SORT_FIELD = 'createTime'

/** 读取榜单原始字段（库中主字段为 type） */
export function extractListTypeRaw(doc) {
  if (!doc) return ''
  const raw = doc.type ?? doc.list_type ?? doc.listType
  return raw == null ? '' : String(raw)
}

/** 兼容驼峰 / 下划线两种库表结构 */
export function normalizeReview(doc) {
  if (!doc) return doc
  const receiptImgRaw = doc.receiptImg || doc.receipt_img || ''
  const receiptImg = isValidReceiptSrc(receiptImgRaw) ? receiptImgRaw : ''
  const hasReceipt = !!(doc.hasReceipt ?? doc.has_receipt ?? receiptImg)
  const create_time = getReviewTimestamp(doc)
  const list_type = normalizeListType(extractListTypeRaw(doc) || 'red')
  const hospital_name = doc.hospital_name || doc.hospitalName || '未知医院'
  const insurance_type = doc.insurance_type || doc.insuranceType || ''
  return {
    ...doc,
    hospital_name,
    hospitalName: hospital_name,
    list_type,
    type: list_type,
    city: doc.city || '',
    district: doc.district || '',
    insurance_type,
    insuranceType: insurance_type,
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    content: doc.content || '',
    nickName: doc.nickName || doc.nick_name || '',
    hasReceipt,
    receiptImg,
    create_time,
    createTime: create_time
  }
}

/** 城市名归一化，兼容「北京」与「北京市」 */
export function normalizeCity(city) {
  if (!city) return ''
  return String(city).replace(/市$/, '').trim()
}

export function normalizeDistrict(district) {
  if (!district) return ''
  return String(district).replace(/区$/, '').trim()
}

export function districtMatches(recordDistrict, filterDistrict) {
  if (!filterDistrict || filterDistrict === '全部区县') return true
  if (!recordDistrict) return false
  return (
    recordDistrict === filterDistrict ||
    normalizeDistrict(recordDistrict) === normalizeDistrict(filterDistrict)
  )
}

export function cityMatches(recordCity, filterCity) {
  if (!filterCity) return true
  if (!recordCity) return false
  return normalizeCity(recordCity) === normalizeCity(filterCity)
}

/** 城市筛选项：仅展示已有评价数据的城市 */
export function getCityOptionsForReviews(reviews, { defaultCity = '北京市' } = {}) {
  const list = (reviews || []).map(normalizeReview).filter(Boolean)
  const cityMap = new Map()
  for (const r of list) {
    if (!r.city) continue
    const key = normalizeCity(r.city)
    if (!cityMap.has(key)) cityMap.set(key, r.city)
  }
  let cities = [...cityMap.values()].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  if (!cities.some((c) => cityMatches(c, defaultCity)) && defaultCity) {
    cities = [defaultCity, ...cities]
  }
  if (!cities.length && defaultCity) {
    cities = [defaultCity]
  }
  return [
    { value: '全部城市', label: '全部城市' },
    ...cities.map((c) => ({ value: c, label: formatCityShort(c) }))
  ]
}

/** 区县筛选项：指定城市下已有评价数据的区县 */
export function getDistrictOptionsForReviews(reviews, city) {
  if (!city || city === '全部城市') return []

  const list = (reviews || []).map(normalizeReview).filter(Boolean)
  const districts = [
    ...new Set(
      list.filter((r) => cityMatches(r.city, city) && r.district).map((r) => r.district)
    )
  ]
  if (!districts.length) return []
  return [
    { value: '全部区县', label: '全部区县' },
    ...districts.sort((a, b) => a.localeCompare(b, 'zh-CN')).map((d) => ({ value: d, label: d }))
  ]
}

function formatCityShort(city) {
  return String(city || '').replace(/市$/, '') || '未知'
}

export function filterReviews(
  list,
  { city, district, districtScope, listType, filterByCity = false, hospitalName } = {}
) {
  let result = (list || []).map(normalizeReview).filter(Boolean)

  if (filterByCity && city) {
    result = result.filter((r) => cityMatches(r.city, city))
  }

  if (district && district !== '全部区县') {
    result = result.filter((r) => districtMatches(r.district, district))
  }

  if (listType && listType !== 'all') {
    result = result.filter((r) => listTypeMatches(r.list_type, listType))
  }

  if (hospitalName && String(hospitalName).trim()) {
    const kw = String(hospitalName).trim().toLowerCase()
    result = result.filter((r) => (r.hospital_name || '').toLowerCase().includes(kw))
  }

  return result.sort((a, b) => getReviewTimestamp(b) - getReviewTimestamp(a))
}
