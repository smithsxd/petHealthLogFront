/**
 * 构建 ECharts option（H5 / 小程序通用）
 */
export function buildWeightChartOption(data, echartsLib) {
  if (!data.length) return null

  const option = {
    animation: false,
    grid: { left: 24, right: 32, top: 24, bottom: 40 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#e4e7ed',
      textStyle: { color: '#303133', fontSize: 12 },
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
      axisLine: { lineStyle: { color: '#e4e7ed' } },
      axisLabel: { color: '#909399', fontSize: 10 },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      min: (v) => Math.floor(Math.min(...data.map(r => r.weight)) / 2) * 2 - 1,
      axisLabel: { color: '#909399', fontSize: 10 },
      splitLine: { lineStyle: { color: '#ebeef5' } },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: [{
      type: 'line',
      data: data.map(d => d.weight),
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: { color: '#ff7d3f', width: 3 },
      itemStyle: { color: '#ff7d3f', borderColor: '#fff', borderWidth: 2 },
      areaStyle: {
        color: echartsLib?.graphic
          ? new echartsLib.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255,125,63,0.18)' },
            { offset: 1, color: 'rgba(255,125,63,0)' }
          ])
          : 'rgba(255,125,63,0.12)'
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
