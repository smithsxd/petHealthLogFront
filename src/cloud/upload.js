/** 宠物头像：选图 → 10MB 校验 → compressImage → 云存储 */
const MAX_AVATAR_SIZE = 10 * 1024 * 1024

export async function uploadPetAvatar(options = {}) {
  const { onPreview, onProgress } = options

  // #ifdef MP-WEIXIN
  try {
    const chooseRes = await uni.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed']
    })

    const localFile = chooseRes.tempFiles[0]
    const localPath = localFile.tempFilePath
    const localSize = localFile.size

    if (localSize > MAX_AVATAR_SIZE) {
      uni.showToast({
        title: '图片太胖啦，不能超过10MB哦！',
        icon: 'none'
      })
      return ''
    }

    onPreview?.(localPath)
    onProgress?.(20, '正在美容中...')

    uni.showLoading({ title: '正在美容中...', mask: true })

    const compressRes = await uni.compressImage({
      src: localPath,
      quality: 70
    })

    const finalPath = compressRes.tempFilePath
    onPreview?.(finalPath)
    onProgress?.(55, '正在送往云端...')

    uni.showLoading({ title: '正在送往云端...', mask: true })

    const cloudPath = `pet_images/${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`
    const uploadRes = await wx.cloud.uploadFile({
      cloudPath,
      filePath: finalPath
    })

    const fileId = uploadRes.fileID
    onProgress?.(100, '上传完成')
    uni.hideLoading()
    uni.showToast({ title: '头像上传成功！', icon: 'success' })
    return fileId
  } catch (err) {
    uni.hideLoading()
    const cancelled = /cancel/i.test(String(err?.errMsg || err?.message || ''))
    if (!cancelled) {
      console.error('上传失败或用户取消了操作：', err)
      uni.showToast({ title: '上传折了，再试一次吧', icon: 'none' })
    }
    return ''
  }
  // #endif

  // #ifndef MP-WEIXIN
  uni.showToast({ title: '头像上传仅支持微信小程序', icon: 'none' })
  return ''
  // #endif
}
