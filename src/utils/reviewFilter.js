import { isCloudFileForCurrentEnv } from '@/cloud/config.js'

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
    doc.create_time ??
    doc.createTime ??
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

/** 兼容手动导入 / 不同命名风格的字段 */
export function normalizeReview(doc) {
  if (!doc) return doc
  const receiptImgRaw = doc.receiptImg || doc.receipt_img || ''
  const receiptImg = isValidReceiptSrc(receiptImgRaw) ? receiptImgRaw : ''
  const hasReceipt = !!(doc.hasReceipt ?? doc.has_receipt ?? receiptImg)
  const create_time = getReviewTimestamp(doc)
  return {
    ...doc,
    hospital_name: doc.hospital_name || doc.hospitalName || '未知医院',
    list_type: doc.list_type || doc.listType || 'red',
    city: doc.city || '',
    district: doc.district || '',
    insurance_type: doc.insurance_type || doc.insuranceType || '',
    tags: doc.tags || [],
    content: doc.content || '',
    hasReceipt,
    receiptImg,
    create_time
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
  if (!recordDistrict) return true
  return (
    recordDistrict === filterDistrict ||
    normalizeDistrict(recordDistrict) === normalizeDistrict(filterDistrict)
  )
}

export function cityMatches(recordCity, filterCity) {
  if (!filterCity) return true
  if (!recordCity) return true
  return normalizeCity(recordCity) === normalizeCity(filterCity)
}

import { getDistrictsForCity } from '@/utils/reviewConstants.js'

export function getDistrictOptionsForReviews(reviews, city, fallbackCity = '北京市') {
  const options = ['全部区县']
  const list = reviews || []
  let districts = []

  if (city) {
    districts = [
      ...new Set(
        list
          .filter((r) => cityMatches(r.city, city))
          .map((r) => r.district)
          .filter(Boolean)
      )
    ]
  }

  if (!districts.length && city) {
    districts = getDistrictsForCity(city)
  }

  if (!districts.length) {
    districts = [...new Set(list.map((r) => r.district).filter(Boolean))]
  }

  if (!districts.length) {
    districts = getDistrictsForCity(fallbackCity)
  }

  return [...options, ...districts.sort()]
}

export function filterReviews(list, { city, district, listType, filterByCity = false } = {}) {
  let result = (list || []).map(normalizeReview).filter(Boolean)

  // 仅当明确开启时才按城市过滤（避免定位城市与发布城市不一致导致「看不到」）
  if (filterByCity && city) {
    const cityFiltered = result.filter((r) => cityMatches(r.city, city))
    if (cityFiltered.length > 0) {
      result = cityFiltered
    }
  }

  if (district && district !== '全部区县') {
    result = result.filter((r) => districtMatches(r.district, district))
  }

  if (listType && listType !== 'all') {
    result = result.filter((r) => r.list_type === listType)
  }

  return result.sort((a, b) => getReviewTimestamp(b) - getReviewTimestamp(a))
}
