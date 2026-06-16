/** 红黑榜 — 前端直连云数据库（与宠物档案同一模式，不依赖云函数） */

import { CLOUD_ENV_ID, ensureCloud, isCloudFileForCurrentEnv } from '@/cloud/config.js'
import { getDb, COLLECTIONS } from '@/cloud/db.js'
import { cloudGet } from '@/cloud/query.js'
import { cloudErrorToast, parseCloudError, formatDbPermissionHint } from '@/cloud/errors.js'
import { ADMIN_OPENID, REVIEW_PAGE_SIZE } from '@/utils/reviewConstants.js'
import { filterReviews, normalizeReview, getReviewTimestamp } from '@/utils/reviewFilter.js'
import { cacheOpenId, getCachedOpenId } from '@/utils/openid.js'

export { ADMIN_OPENID, REVIEW_PAGE_SIZE }

const PING_CONTENT = '__review_write_ping__'

function buildReviewDoc(data) {
  const now = Date.now()
  const hasReceipt = !!data.receiptFileId
  return {
    hospital_name: data.hospitalName,
    list_type: data.listType,
    city: data.city || '',
    district: data.district || '',
    insurance_type: data.insuranceType || '',
    tags: data.tags || [],
    content: data.content,
    hasReceipt,
    receiptImg: data.receiptFileId || '',
    create_time: now
  }
}

export function isPingRecord(doc) {
  return doc?.content === PING_CONTENT || doc?.hospital_name === '__ping__'
}

/** 获取当前登录用户 OpenID（pets → 本地缓存，不依赖云函数） */
export async function fetchCurrentOpenId() {
  try {
    const db = await getDb()
    const petRes = await db.collection(COLLECTIONS.PETS).limit(1).get()
    const openid = petRes.data?.[0]?._openid
    if (openid) {
      cacheOpenId(openid)
      return openid
    }
  } catch (err) {
    console.warn('[review] fetchCurrentOpenId from pets failed:', err)
  }

  const cached = getCachedOpenId()
  if (cached) return cached

  return ''
}

export async function uploadReceiptImage(localPath) {
  // #ifdef MP-WEIXIN
  ensureCloud()
  const cloudPath = `review_receipts/${Date.now()}-${Math.floor(Math.random() * 10000)}.jpg`
  const uploadRes = await wx.cloud.uploadFile({
    env: CLOUD_ENV_ID,
    cloudPath,
    filePath: localPath
  })
  const fileId = uploadRes.fileID
  if (!fileId) {
    throw new Error('图片上传失败：未返回 fileID')
  }
  return fileId
  // #endif
  // #ifndef MP-WEIXIN
  throw new Error('仅支持微信小程序')
  // #endif
}

/** 合并远端拉取与本地已有记录，避免后台刷新冲掉刚发布的条目 */
export function mergeReviewLists(incoming, existing) {
  const map = new Map()
  for (const r of existing || []) {
    if (r?._id) map.set(String(r._id), normalizeReview(r))
  }
  for (const r of incoming || []) {
    if (r?._id) map.set(String(r._id), normalizeReview(r))
  }
  return [...map.values()].sort((a, b) => getReviewTimestamp(b) - getReviewTimestamp(a))
}

function normalizeReviewList(rawList) {
  return (rawList || [])
    .map(normalizeReview)
    .filter((r) => r && !isPingRecord(r))
    .sort((a, b) => getReviewTimestamp(b) - getReviewTimestamp(a))
}

/**
 * 分页拉取评价（按 create_time 降序游标，避免 skip 在大数据量下变慢）
 * @param {{ limit?: number, beforeTime?: number|null, withCount?: boolean }} options
 */
export async function fetchReviewsPage({ limit = REVIEW_PAGE_SIZE, beforeTime = null, withCount = false } = {}) {
  try {
    const db = await getDb()
    const coll = db.collection(COLLECTIONS.REVIEWS)
    const _ = db.command

    let dbCount
    if (withCount) {
      const countRes = await coll.count()
      dbCount = countRes?.total ?? 0
    }

    const runQuery = () => {
      if (beforeTime != null && beforeTime > 0) {
        return coll
          .where({ create_time: _.lt(beforeTime) })
          .orderBy('create_time', 'desc')
          .limit(limit)
          .get()
      }
      return coll.orderBy('create_time', 'desc').limit(limit).get()
    }

    const raw = await cloudGet(runQuery, { label: 'reviews-page', retries: 2 })
    const list = normalizeReviewList(raw)

    if (typeof dbCount === 'number' && dbCount > 0 && !beforeTime && list.length === 0) {
      return {
        list: [],
        hasMore: false,
        dbCount,
        error:
          `云库有 ${dbCount} 条记录但读不到。请检查 hospital_reviews 权限 read 是否为 true，` +
          `以及环境 ID 是否为 ${CLOUD_ENV_ID}`
      }
    }

    return {
      list,
      hasMore: raw.length >= limit,
      dbCount,
      error: ''
    }
  } catch (err) {
    console.error('[review] fetchReviewsPage failed:', err)
    const info = cloudErrorToast(err, '加载评价失败')
    return { list: [], hasMore: false, dbCount: 0, error: info }
  }
}

/** 按 ID 拉取单条（发布后即时回显） */
export async function fetchReviewById(reviewId) {
  if (!reviewId) return null
  const id = String(reviewId)
  try {
    const db = await getDb()
    const res = await db.collection(COLLECTIONS.REVIEWS).doc(id).get()
    // doc().get() 返回的 data 不含 _id，需手动补上
    const doc = normalizeReview({ ...res?.data, _id: res?.data?._id || id })
    return doc && !isPingRecord(doc) ? doc : null
  } catch (err) {
    console.warn('[review] fetchReviewById failed:', reviewId, err)
    return null
  }
}

/**
 * 拉取原始列表
 * @returns {{ list: Array, error: string }}
 */
/** 拉取首页（兼容旧调用方） */
export async function fetchAllReviews() {
  const result = await fetchReviewsPage({ withCount: true })
  console.log('[review] loaded page 1, get:', result.list.length, 'count():', result.dbCount)
  return result
}

export async function loadReviews(options = {}) {
  const { list } = await fetchAllReviews()
  return filterReviews(list, options)
}

export async function countVerifiedReviews() {
  try {
    const db = await getDb()
    const coll = db.collection(COLLECTIONS.REVIEWS)
    const verifiedRes = await coll.where({ hasReceipt: true }).count()
    if (verifiedRes?.total > 0) return verifiedRes.total
    const totalRes = await coll.count()
    return totalRes?.total || 0
  } catch (_) {
    return 0
  }
}

/** 探测云数据库：读必通，写单独检测（写失败不阻断列表加载） */
export async function pingCloudReviews() {
  try {
    ensureCloud()
    const db = await getDb()
    const countRes = await db.collection(COLLECTIONS.REVIEWS).count()
    const count = countRes.total || 0

    let writeOk = false
    let writeError = ''
    try {
      const addRes = await db.collection(COLLECTIONS.REVIEWS).add({
        data: {
          hospital_name: '__ping__',
          list_type: 'red',
          content: PING_CONTENT,
          create_time: Date.now()
        }
      })
      if (addRes?._id) {
        await db.collection(COLLECTIONS.REVIEWS).doc(addRes._id).remove()
        writeOk = true
      }
    } catch (writeErr) {
      writeError = formatDbPermissionHint(writeErr)
      console.error('[review] write ping failed:', writeErr)
    }

    return {
      ok: true,
      count,
      writeOk,
      writeError,
      env: CLOUD_ENV_ID
    }
  } catch (err) {
    const info = parseCloudError(err)
    const msg = err?.errMsg || err?.message || '云数据库不可用'
    return {
      ok: false,
      writeOk: false,
      error: info.envMissing ? `云环境不存在：${CLOUD_ENV_ID}` : msg,
      env: CLOUD_ENV_ID
    }
  }
}

async function verifyPublishedDoc(db, id) {
  try {
    const verify = await db.collection(COLLECTIONS.REVIEWS).doc(id).get()
    if (verify?.data) {
      const savedDoc = normalizeReview({ ...verify.data, _id: id })
      if (verify.data._openid) {
        cacheOpenId(verify.data._openid)
      }
      return savedDoc
    }
  } catch (err) {
    console.warn('[review] publish verify failed:', err)
  }
  throw new Error(
    `写入后无法回读。请确认微信开发者工具当前云环境是 ${CLOUD_ENV_ID}，` +
    '并在云开发控制台的 hospital_reviews 集合里查看这条 _id'
  )
}

export async function publishReview(data) {
  ensureCloud()
  const db = await getDb()
  const doc = buildReviewDoc(data)

  let res
  try {
    res = await db.collection(COLLECTIONS.REVIEWS).add({ data: doc })
  } catch (err) {
    const info = parseCloudError(err)
    console.error('[review] publish add failed:', err)
    if (info.envMissing) {
      throw new Error(`云环境不存在，请修改 src/cloud/config.js（当前 ${CLOUD_ENV_ID}）`)
    }
    if (info.permissionDenied) {
      throw new Error(formatDbPermissionHint(err))
    }
    throw new Error(err?.errMsg || err?.message || '写入 hospital_reviews 失败')
  }

  if (!res?._id) {
    throw new Error('写入失败：未返回记录 ID')
  }

  const id = res._id
  console.log('[review] published via db:', id)
  const savedDoc = await verifyPublishedDoc(db, id)
  return { id, doc: savedDoc }
}

function buildReviewUpdatePayload(data) {
  const hasReceipt = !!data.receiptFileId
  return {
    hospital_name: data.hospitalName,
    list_type: data.listType,
    city: data.city || '',
    district: data.district || '',
    insurance_type: data.insuranceType || '',
    tags: data.tags || [],
    content: data.content,
    hasReceipt,
    receiptImg: data.receiptFileId || '',
    update_time: Date.now()
  }
}

/** 管理员编辑评价 */
export async function adminUpdateReview(reviewId, data, { verifiedAdmin = false } = {}) {
  if (!reviewId) {
    throw new Error('无效的评价 ID')
  }

  ensureCloud()

  if (!verifiedAdmin) {
    const openid = await fetchCurrentOpenId()
    if (openid !== ADMIN_OPENID) {
      const hint = openid ? `${openid.slice(0, 10)}...` : '未获取到'
      throw new Error(`无权编辑（OpenID: ${hint}）`)
    }
  }

  const db = await getDb()
  const id = String(reviewId)
  const payload = buildReviewUpdatePayload(data)

  // #ifdef MP-WEIXIN
  const oldReceipt = data.oldReceiptFileId || ''
  const newReceipt = data.receiptFileId || ''
  if (oldReceipt && newReceipt && oldReceipt !== newReceipt && isCloudFileForCurrentEnv(oldReceipt) && wx.cloud?.deleteFile) {
    await wx.cloud.deleteFile({ env: CLOUD_ENV_ID, fileList: [oldReceipt] }).catch(() => {})
  }
  // #endif

  try {
    await db.collection(COLLECTIONS.REVIEWS).doc(id).update({ data: payload })
  } catch (err) {
    const info = parseCloudError(err)
    if (info.envMissing) {
      throw new Error(`云环境不存在，请确认环境 ID：${CLOUD_ENV_ID}`)
    }
    if (info.permissionDenied) {
      throw new Error(formatDbPermissionHint(err))
    }
    throw new Error(err?.errMsg || err?.message || '更新 hospital_reviews 失败')
  }

  const savedDoc = await verifyPublishedDoc(db, id)
  console.log('[review] updated ok:', id)
  return { id, doc: savedDoc }
}

async function removeReviewDoc(db, reviewId) {
  const id = String(reviewId)

  // 方式 1：按 doc id 删除
  try {
    const res = await db.collection(COLLECTIONS.REVIEWS).doc(id).remove()
    if (res?.stats?.removed > 0) return res
  } catch (err) {
    const info = parseCloudError(err)
    if (!info.permissionDenied && !/can not remove/i.test(info.msg)) {
      throw err
    }
  }

  // 方式 2：where 兜底（部分导入数据 doc 删除异常时）
  const res2 = await db.collection(COLLECTIONS.REVIEWS).where({ _id: id }).remove()
  return res2
}

/** 管理员删除 */
export async function adminDeleteReview(reviewId, { verifiedAdmin = false } = {}) {
  if (!reviewId) {
    throw new Error('无效的评价 ID')
  }

  ensureCloud()

  if (!verifiedAdmin) {
    const openid = await fetchCurrentOpenId()
    if (openid !== ADMIN_OPENID) {
      const hint = openid ? `${openid.slice(0, 10)}...` : '未获取到'
      throw new Error(`无权删除（OpenID: ${hint}）`)
    }
  }

  const db = await getDb()
  const id = String(reviewId)

  // 删图失败不阻断删库
  // #ifdef MP-WEIXIN
  try {
    const docRes = await db.collection(COLLECTIONS.REVIEWS).doc(id).get()
    const img = docRes.data?.receiptImg || docRes.data?.receipt_img
    if (img && isCloudFileForCurrentEnv(img) && wx.cloud?.deleteFile) {
      await wx.cloud.deleteFile({ env: CLOUD_ENV_ID, fileList: [img] }).catch(() => {})
    }
  } catch (_) {}
  // #endif

  let res
  try {
    res = await removeReviewDoc(db, id)
  } catch (err) {
    const info = parseCloudError(err)
    if (info.envMissing) {
      throw new Error(`云环境不存在，请确认环境 ID：${CLOUD_ENV_ID}`)
    }
    if (info.permissionDenied || /can not remove/i.test(info.msg)) {
      throw new Error(formatDbPermissionHint(err))
    }
    throw new Error(err?.errMsg || err?.message || '删除失败')
  }

  if (!res?.stats?.removed) {
    throw new Error(
      '未删除任何记录。该条可能是控制台导入的数据，且当前权限为「仅创建者可写」。' +
      '请将 hospital_reviews 权限改为 {"read":true,"write":true}'
    )
  }

  console.log('[review] deleted ok:', id)
  return true
}

export async function resolveLocationCityDistrict() {
  const { resolveCityDistrictByLocation } = await import('@/utils/location.js')
  const geo = await resolveCityDistrictByLocation()
  return { city: geo.city || '', district: geo.district || '' }
}

export function handleReviewError(err, fallback = '操作失败') {
  const msg = formatDbPermissionHint(err) || cloudErrorToast(err, fallback)
  uni.showToast({ title: msg, icon: 'none', duration: 3000 })
}
