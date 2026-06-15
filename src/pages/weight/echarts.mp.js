/** 体重页专用：从本分包 static 加载 echarts */
export function getMpEcharts() {
  const mod = require('./static/echarts.min.js')
  return mod?.init ? mod : (mod?.default || mod)
}
