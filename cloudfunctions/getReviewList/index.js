const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const COLLECTION = 'hospital_reviews'

exports.main = async (event) => {
  const { action } = event || {}

  if (action === 'countVerified') {
    try {
      const res = await db.collection(COLLECTION).where({ hasReceipt: true }).count()
      return { ok: true, total: res.total || 0 }
    } catch (err) {
      console.error('[getReviewList] countVerified error:', err)
      return { ok: false, errMsg: err.message || '统计失败', total: 0 }
    }
  }

  try {
    const res = await db.collection(COLLECTION).limit(200).get()
    const list = (res.data || []).sort(
      (a, b) => (b.create_time || 0) - (a.create_time || 0)
    )
    return { ok: true, data: list }
  } catch (err) {
    console.error('[getReviewList] error:', err)
    return { ok: false, errMsg: err.message || '查询失败', data: [] }
  }
}
