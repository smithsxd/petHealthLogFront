/** 云数据库查询工具：超时保护 + 客户端排序（避免缺索引导致 hang/timeout） */

const DEFAULT_TIMEOUT = 20000

export function withCloudTimeout(promise, label = 'cloud', ms = DEFAULT_TIMEOUT) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} 请求超时`)), ms)
    })
  ])
}

export async function cloudGet(queryPromise, { label = 'cloud', sort } = {}) {
  const res = await withCloudTimeout(queryPromise, label)
  let list = res?.data || []
  if (typeof sort === 'function') {
    list = [...list].sort(sort)
  }
  return list
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
