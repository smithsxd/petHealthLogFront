/** 云数据库查询工具：超时保护 + 客户端排序 + 有限重试 */

import { parseCloudError, delay } from '@/cloud/errors.js'

const DEFAULT_TIMEOUT = 25000

export function withCloudTimeout(promise, label = 'cloud', ms = DEFAULT_TIMEOUT) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} 请求超时`)), ms)
    })
  ])
}

/**
 * @param {Function|Promise} getQuery 查询工厂函数，或已创建的 Promise（兼容旧写法）
 */
export async function cloudGet(getQuery, { label = 'cloud', sort, retries = 1, timeout = DEFAULT_TIMEOUT } = {}) {
  const run = typeof getQuery === 'function' ? getQuery : () => getQuery
  let lastErr

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await withCloudTimeout(run(), label, timeout)
      let list = res?.data || []
      if (typeof sort === 'function') {
        list = [...list].sort(sort)
      }
      return list
    } catch (err) {
      lastErr = err
      const info = parseCloudError(err)
      console.warn(`[cloud] ${label} attempt ${attempt + 1} failed:`, info.msg)
      if (attempt < retries && info.retriable) {
        await delay(800)
        continue
      }
      throw err
    }
  }

  throw lastErr
}

export function sortBy(field, order = 'asc') {
  return (a, b) => {
    const va = a[field]
    const vb = b[field]
    if (va === vb) return 0
    if (va == null) return 1
    if (vb == null) return -1
    const cmp = va < vb ? -1 : 1
    return order === 'desc' ? -cmp : cmp
  }
}
