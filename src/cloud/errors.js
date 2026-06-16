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

  const permissionDenied =
    /permission denied|can not remove|cannot remove|无权|无权限|not authorized/i.test(msg)

  return { msg, code, authExpired, envMissing, timeout, retriable, permissionDenied }
}

/** 将云数据库权限错误转为可操作提示 */
export function formatDbPermissionHint(err) {
  const info = parseCloudError(err)
  if (info.permissionDenied || /can not remove|cannot create|permission/i.test(info.msg)) {
    return (
      'hospital_reviews 写入被拒（create 权限）。请到云开发控制台改权限：' +
      '{"read":true,"create":true,"update":"doc._openid==auth.openid","delete":"doc._openid==auth.openid||auth.openid==\'你的OpenID\'"}' +
      '；前端当前只走直连数据库，不走云函数'
    )
  }
  return info.msg
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
