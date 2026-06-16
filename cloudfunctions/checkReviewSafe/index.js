const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/** 与前端 src/cloud/db.js 保持一致 */
const REVIEWS_COLLECTION = 'hospital_reviews'

/** 超管 OpenID — 与前端保持一致 */
const ADMIN_OPENID = 'oYAAb5P-QSbbTXSu7xcFLmTPSSH4'

async function deleteReceiptFile(fileId) {
  if (!fileId) return
  try {
    await cloud.deleteFile({ fileList: [fileId] })
  } catch (err) {
    console.warn('[checkReviewSafe] deleteFile failed:', err)
  }
}

async function checkText(content, openid) {
  if (!content || !content.trim()) return { ok: true }
  try {
    const res = await cloud.openapi.security.msgSecCheck({
      version: 2,
      openid,
      scene: 2,
      content: content.trim()
    })
    if (res.errCode === 0) return { ok: true }
    return { ok: false, errMsg: '文字内容未通过安全审查，请修改后重试' }
  } catch (err) {
    const code = err?.errCode ?? err?.errcode
    if (code === 87014) {
      return { ok: false, errMsg: '文字内容含有违规信息，请修改后重试' }
    }
    console.error('[checkReviewSafe] msgSecCheck error:', err)
    return { ok: false, errMsg: '文字安全审查失败，请稍后重试' }
  }
}

async function checkImage(receiptFileId) {
  if (!receiptFileId) return { ok: true }
  try {
    const download = await cloud.downloadFile({ fileID: receiptFileId })
    const res = await cloud.openapi.security.imgSecCheck({
      media: {
        contentType: 'image/jpeg',
        value: download.fileContent
      }
    })
    if (res.errCode === 0) return { ok: true }
    return { ok: false, errMsg: '图片未通过安全审查，请更换后重试' }
  } catch (err) {
    const code = err?.errCode ?? err?.errcode
    if (code === 87014) {
      return { ok: false, errMsg: '图片含有违规内容，请更换后重试' }
    }
    console.error('[checkReviewSafe] imgSecCheck error:', err)
    return { ok: false, errMsg: '图片安全审查失败，请稍后重试' }
  }
}

function buildReviewDoc(event) {
  const {
    hospitalName, listType, city, district,
    insuranceType, tags, content, receiptFileId
  } = event
  return {
    hospital_name: hospitalName,
    list_type: listType,
    city: city || '',
    district: district || '',
    insurance_type: insuranceType || '',
    tags: tags || [],
    content: content || '',
    hasReceipt: !!receiptFileId,
    receiptImg: receiptFileId || '',
    create_time: Date.now()
  }
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const action = event?.action

  if (action === 'getOpenId') {
    return { ok: true, openid, isAdmin: openid === ADMIN_OPENID }
  }

  if (action === 'listReviews') {
    try {
      const res = await db.collection(REVIEWS_COLLECTION).orderBy('create_time', 'desc').limit(100).get()
      return { ok: true, data: res.data || [], collection: REVIEWS_COLLECTION, total: (res.data || []).length }
    } catch (err) {
      console.error('[checkReviewSafe] listReviews error:', err)
      try {
        const res = await db.collection(REVIEWS_COLLECTION).limit(100).get()
        return { ok: true, data: res.data || [], collection: REVIEWS_COLLECTION, total: (res.data || []).length }
      } catch (err2) {
        return { ok: false, errMsg: err2.message || '查询失败', data: [] }
      }
    }
  }

  if (action === 'countReviews') {
    try {
      const res = await db.collection(REVIEWS_COLLECTION).count()
      const listRes = await db.collection(REVIEWS_COLLECTION).limit(100).get()
      const list = listRes.data || []
      const verified = list.filter((r) => r.hasReceipt || r.receiptImg).length
      return { ok: true, total: res.total || 0, verified, collection: REVIEWS_COLLECTION }
    } catch (err) {
      console.error('[checkReviewSafe] countReviews error:', err)
      return { ok: false, errMsg: err.message || '统计失败', total: 0, verified: 0 }
    }
  }

  if (action === 'publishReview') {
    try {
      if (!openid) {
        return { ok: false, errMsg: '未获取到用户身份，请重新登录小程序后再试' }
      }

      const textResult = await checkText(event.content, openid)
      if (!textResult.ok) {
        await deleteReceiptFile(event.receiptFileId)
        return textResult
      }

      const imgResult = await checkImage(event.receiptFileId)
      if (!imgResult.ok) {
        await deleteReceiptFile(event.receiptFileId)
        return imgResult
      }

      const doc = buildReviewDoc(event)
      const res = await db.collection(REVIEWS_COLLECTION).add({ data: doc })
      if (!res?._id) {
        return { ok: false, errMsg: '写入失败：未返回记录 ID' }
      }
      return { ok: true, id: res._id, doc: { ...doc, _id: res._id } }
    } catch (err) {
      console.error('[checkReviewSafe] publishReview error:', err)
      return { ok: false, errMsg: err.message || '发布失败' }
    }
  }

  const { content = '', receiptFileId = '' } = event || {}

  const textResult = await checkText(content, openid)
  if (!textResult.ok) {
    await deleteReceiptFile(receiptFileId)
    return textResult
  }

  const imgResult = await checkImage(receiptFileId)
  if (!imgResult.ok) {
    await deleteReceiptFile(receiptFileId)
    return imgResult
  }

  return { ok: true, openid, isAdmin: openid === ADMIN_OPENID }
}
