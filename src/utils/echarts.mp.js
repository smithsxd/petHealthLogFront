/** 小程序端加载 lime-echart 专用 echarts UMD 包 */
export function getMpEcharts() {
  const mod = require('../static/echarts.min.js')
  return mod?.init ? mod : (mod?.default || mod)
}
