/** 解析微信云 / uni API 错误，便于统一提示与重试 */

export function parseCloudError(err) {
  const msg = String(err?.errMsg || err?.message || err || '未知错误')
  const code = err?.errCode ?? err?.errno ?? err?.code

  const authExpired =
    code === 42001 ||
    /access_token expired/i.test(msg) ||
    /webapi_getwxaasyncsecinfo/i.test(msg)

  const envMissing =
    code === -501000 ||
    /Env Not Exists/i.test(msg) ||
    /env.*not.*exist/i.test(msg)

  const timeout =
    /timeout/i.test(msg) ||
    /请求超时/i.test(msg)

  const retriable = timeout && !authExpired

  return { msg, code, authExpired, envMissing, timeout, retriable }
}

export function cloudErrorToast(err, fallback = '操作失败') {
  const info = parseCloudError(err)
  if (info.authExpired) {
    return '开发者工具登录已过期，请重新扫码登录后再试'
  }
  if (info.envMissing) {
    return '云环境不存在，请检查 AppID 与环境 ID'
  }
  if (info.timeout) {
    return '云数据库请求超时，请检查网络或云开发控制台'
  }
  if (/初始化失败|不可用/.test(info.msg)) {
    return info.msg
  }
  return fallback
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
