/**
 * 构建 ECharts option（H5 / 小程序通用）
 * @param {object} options.dark 是否暗色主题
 */
export function buildWeightChartOption(data, echartsLib, options = {}) {
  if (!data.length) return null

  const dark = !!options.dark
  const axis = dark ? '#9a8fb0' : '#909399'
  const line = dark ? '#3d3550' : '#ebeef5'
  const gridLine = dark ? '#332d42' : '#ebeef5'
  const tipBg = dark ? '#252033' : '#fff'
  const tipBorder = dark ? '#3d3550' : '#e4e7ed'
  const tipText = dark ? '#f5f0fa' : '#303133'
  const primary = dark ? '#ff9a66' : '#ff7d3f'

  const option = {
    animation: false,
    grid: { left: 24, right: 32, top: 24, bottom: 40 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: tipBg,
      borderColor: tipBorder,
      textStyle: { color: tipText, fontSize: 12 },
      shadowBlur: 0,
      renderMode: 'richText',
      formatter: (p) => {
        const d = p[0]
        return `${parseFloat(d.value).toFixed(1)} kg\n${d.axisValue}`
      }
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.date.slice(5)),
      axisLine: { lineStyle: { color: line } },
      axisLabel: { color: axis, fontSize: 10 },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      min: (v) => Math.floor(Math.min(...data.map(r => r.weight)) / 2) * 2 - 1,
      axisLabel: { color: axis, fontSize: 10 },
      splitLine: { lineStyle: { color: gridLine } },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: [{
      type: 'line',
      data: data.map(d => d.weight),
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: { color: primary, width: 3 },
      itemStyle: { color: primary, borderColor: dark ? '#252033' : '#fff', borderWidth: 2 },
      areaStyle: {
        color: echartsLib?.graphic
          ? new echartsLib.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: dark ? 'rgba(255,154,102,0.25)' : 'rgba(255,125,63,0.18)' },
            { offset: 1, color: 'rgba(255,125,63,0)' }
          ])
          : (dark ? 'rgba(255,154,102,0.15)' : 'rgba(255,125,63,0.12)')
      }
    }]
  }

  return option
}

export function filterChartDataByRange(data, range) {
  if (range === 'all') return data
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - (range === '3m' ? 3 : 6))
  return data.filter(d => new Date(d.date) >= cutoff)
}
