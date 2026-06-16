const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const REVIEWS_COLLECTION = 'hospital_reviews'
const ADMIN_OPENID = 'oYAAb5P-QSbbTXSu7xcFLmTPSSH4'

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (openid !== ADMIN_OPENID) {
    return { ok: false, errMsg: '无权执行此操作' }
  }

  const { reviewId } = event || {}
  if (!reviewId) {
    return { ok: false, errMsg: '缺少评价 ID' }
  }

  try {
    const docRes = await db.collection(REVIEWS_COLLECTION).doc(reviewId).get()
    const review = docRes?.data
    if (!review) {
      return { ok: false, errMsg: '评价不存在或已删除' }
    }

    if (review.receiptImg) {
      try {
        await cloud.deleteFile({ fileList: [review.receiptImg] })
      } catch (err) {
        console.warn('[adminDeleteReview] deleteFile failed:', err)
      }
    }

    await db.collection(REVIEWS_COLLECTION).doc(reviewId).remove()
    return { ok: true }
  } catch (err) {
    console.error('[adminDeleteReview] error:', err)
    return { ok: false, errMsg: '删除失败，请稍后重试' }
  }
}
