/**
 * 验单图片 Canvas 极致压缩
 * 硬性指标：最大宽度 800px，JPG，quality 0.7
 * 目标：将几 MB 大图压制到 ~150KB
 */

const MAX_WIDTH = 800
const QUALITY = 0.7
const CANVAS_ID = 'receipt-compress-canvas'

function getImageInfo(src) {
  return new Promise((resolve, reject) => {
    uni.getImageInfo({
      src,
      success: resolve,
      fail: reject
    })
  })
}

function calcSize(width, height) {
  if (width <= MAX_WIDTH) {
    return { width, height }
  }
  const ratio = MAX_WIDTH / width
  return {
    width: MAX_WIDTH,
    height: Math.round(height * ratio)
  }
}

function drawAndExport(ctx, canvasId, src, w, h) {
  return new Promise((resolve, reject) => {
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(src, 0, 0, w, h)
    ctx.draw(false, () => {
      setTimeout(() => {
        uni.canvasToTempFilePath({
          canvasId,
          x: 0,
          y: 0,
          width: w,
          height: h,
          destWidth: w,
          destHeight: h,
          fileType: 'jpg',
          quality: QUALITY,
          success: (res) => resolve(res.tempFilePath),
          fail: reject
        })
      }, 120)
    })
  })
}

/**
 * @param {string} filePath 本地临时路径
 * @param {object} [componentInstance] 组件实例，用于 canvas 绑定
 * @returns {Promise<string>} 压缩后的临时路径
 */
export async function compressReceiptImage(filePath, componentInstance) {
  const info = await getImageInfo(filePath)
  const { width, height } = calcSize(info.width, info.height)
  const ctx = uni.createCanvasContext(CANVAS_ID, componentInstance)
  return drawAndExport(ctx, CANVAS_ID, filePath, width, height)
}

export { CANVAS_ID, MAX_WIDTH, QUALITY }
