<template>
  <TabPageLayout title="体重管理" show-back back-to-index tab-current="weight">
    <PetBar v-if="petBarPets.length" :pets="petBarPets" v-model="currentPetIndex" />
    <EmptyState v-else icon="🐾" title="还没有宠物" desc="请先在档案页添加宠物" />

    <view class="summary" v-if="chartData.length">
      <view class="sum-item">
        <text class="sum-label">当前体重</text>
        <text class="sum-value pri">{{ currentW }}<text class="sum-unit"> kg</text></text>
        <text class="sum-delta" :class="deltaClass">较上次 {{ deltaText }}</text>
      </view>
      <view class="sum-item">
        <text class="sum-label">最低</text>
        <text class="sum-value">{{ minW }}</text>
        <text class="sum-delta muted">kg</text>
      </view>
      <view class="sum-item">
        <text class="sum-label">最高</text>
        <text class="sum-value">{{ maxW }}</text>
        <text class="sum-delta muted">kg</text>
      </view>
    </view>

    <view class="section" v-if="petStore.currentPetId">
      <view class="card">
        <view class="form-row">
          <view class="form-item">
            <text class="form-label">体重 (kg)</text>
            <input class="form-input" v-model="weightInput" type="digit" placeholder="0.0" />
          </view>
          <view class="form-item">
            <text class="form-label">日期</text>
            <picker mode="date" :value="dateVal" @change="onDateChange">
              <view class="picker-cell">
                <text class="picker-cell-text">{{ displayDate }}</text>
                <text class="picker-cell-arrow">▾</text>
              </view>
            </picker>
          </view>
        </view>
        <view class="btn-primary" @click="recordWeight">记录体重</view>
      </view>
    </view>

    <view class="section chart-wrap" v-if="chartData.length">
      <view class="chart-tabs">
        <view class="chart-tab" :class="{ active: range === '3m' }" @click="range = '3m'">近 3 个月</view>
        <view class="chart-tab" :class="{ active: range === '6m' }" @click="range = '6m'">近半年</view>
        <view class="chart-tab" :class="{ active: range === 'all' }" @click="range = 'all'">全部历史</view>
      </view>
      <view class="chart-box">
        <!-- #ifdef H5 -->
        <view id="weightChartH5" class="chart-canvas" />
        <!-- #endif -->
        <!-- #ifndef H5 -->
        <l-echart
          v-if="showChart"
          :key="'chart-' + petStore.currentPetId"
          ref="chartRef"
          type=""
          :before-delay="80"
          is-disable-scroll
          custom-style="width:100%;height:560rpx;"
          @finished="onChartReady"
        />
        <!-- #endif -->
      </view>
    </view>
    <EmptyState v-else-if="petStore.currentPetId" icon="📊" title="暂无体重数据" desc="记录第一次体重，开始追踪成长曲线" />

    <view class="section hist" v-if="historyData.length">
      <text class="hist-title">记录历史 · 左滑删除</text>
      <u-swipe-action>
        <u-swipe-action-item
          v-for="(d, i) in historyData"
          :key="d._id"
          :index="i"
          :options="swipeOptions"
          @click="deleteWeight(i)"
        >
          <view class="hist-inner">
            <view class="hist-info">
              <text class="hist-weight">{{ d.weight }} kg</text>
              <text class="hist-date">{{ d.date }}</text>
            </view>
            <text class="hist-delta" :class="d.deltaClass">{{ d.deltaText }}</text>
          </view>
        </u-swipe-action-item>
      </u-swipe-action>
    </view>

    <template #extra>
    </template>
  </TabPageLayout>
</template>

<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import TabPageLayout from '@/components/TabPageLayout/index.vue'
import PetBar from '@/components/PetBar/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
import { buildWeightChartOption, filterChartDataByRange } from '@/utils/chart.js'
import { isDark } from '@/store/theme.js'
import {
  petStore,
  petBarPets,
  currentPetIndex,
  loadPets,
  addWeight,
  removeWeight
} from '@/store/pet.js'
import { formatDisplayDate, todayISO } from '@/cloud/helpers.js'

// #ifdef H5
import { onMounted } from 'vue'
import * as echarts from 'echarts'
// #endif

// #ifndef H5
import { getMpEcharts } from './echarts.mp.js'
const echarts = getMpEcharts()
// #endif

const weightInput = ref('')
const displayDate = ref(formatDisplayDate(todayISO()))
const dateVal = ref(todayISO())
const range = ref('3m')
const chartRef = ref(null)
const showChart = ref(true)
let chartInstance = null
let chartReady = false
let initPromise = null
let updateTimer = null
let updateRetry = 0

const swipeOptions = [{
  text: '删除',
  style: { backgroundColor: '#fa3534', color: '#fff', fontSize: '13px' }
}]

const chartData = computed(() =>
  petStore.weights
    .map((w) => ({ _id: w._id, date: w.record_date, weight: w.weight }))
    .filter((d) => d.weight > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
)

const currentW = computed(() => {
  const d = chartData.value
  return d.length ? d[d.length - 1].weight : '--'
})
const minW = computed(() => {
  const d = chartData.value
  if (!d.length) return '--'
  return Math.min(...d.map((i) => i.weight)).toFixed(1)
})
const maxW = computed(() => {
  const d = chartData.value
  if (!d.length) return '--'
  return Math.max(...d.map((i) => i.weight)).toFixed(1)
})
const deltaText = computed(() => {
  const d = chartData.value
  if (d.length < 2) return '—'
  const diff = (d[d.length - 1].weight - d[d.length - 2].weight).toFixed(1)
  return diff > 0 ? `↑ ${diff}` : diff < 0 ? `↓ ${Math.abs(diff)}` : '持平'
})
const deltaClass = computed(() => {
  const d = chartData.value
  if (d.length < 2) return ''
  const last = d[d.length - 1].weight
  const prev = d[d.length - 2].weight
  return last > prev ? 'up' : last < prev ? 'down' : ''
})

const historyData = computed(() =>
  [...chartData.value].reverse().map((d, i, arr) => {
    const prev = i < arr.length - 1 ? arr[i + 1].weight : d.weight
    const diff = (d.weight - prev).toFixed(1)
    return {
      ...d,
      deltaClass: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat',
      deltaText: diff > 0 ? `↑ ${diff}` : diff < 0 ? `↓ ${Math.abs(diff)}` : '→ 0'
    }
  })
)

async function deleteWeight(i) {
  const item = historyData.value[i]
  if (!item?._id) return
  try {
    await removeWeight(item._id)
    uni.showToast({ title: '已删除', icon: 'success' })
  } catch (err) {
    console.error(err)
    uni.showToast({ title: '删除失败', icon: 'none' })
  }
}

async function recordWeight() {
  if (!petStore.currentPetId) {
    uni.showToast({ title: '请先添加宠物', icon: 'none' })
    return
  }
  const w = parseFloat(weightInput.value)
  if (isNaN(w) || w < 0.1 || w > 50) {
    uni.showToast({ title: '请输入 0.1~50 kg', icon: 'none' })
    return
  }
  try {
    await addWeight(w, dateVal.value)
    weightInput.value = ''
    uni.showToast({ title: '已记录', icon: 'success' })
  } catch (err) {
    console.error(err)
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

function onDateChange(e) {
  const val = e.detail.value
  dateVal.value = val
  displayDate.value = formatDisplayDate(val)
}

function getChartOption() {
  if (!chartData.value.length) return null
  const data = filterChartDataByRange(chartData.value, range.value)
  if (!data.length) return null
  return buildWeightChartOption(data, echarts, { dark: isDark.value })
}

function scheduleChartUpdate() {
  if (updateTimer) clearTimeout(updateTimer)
  updateTimer = setTimeout(() => {
    updateTimer = null
    updateChart()
  }, 80)
}

function resetChartState() {
  chartInstance = null
  initPromise = null
  chartReady = false
  updateRetry = 0
  if (updateTimer) {
    clearTimeout(updateTimer)
    updateTimer = null
  }
}

function initChartOnce() {
  if (chartInstance) return Promise.resolve(chartInstance)
  if (initPromise) return initPromise
  const comp = chartRef.value
  if (!comp || typeof comp.init !== 'function') {
    return Promise.reject(new Error('chart component not ready'))
  }
  initPromise = comp.init(echarts)
    .then((chart) => {
      chartInstance = chart
      if (!chartInstance) throw new Error('chart init failed')
      return chartInstance
    })
    .catch((err) => {
      initPromise = null
      throw err
    })
  return initPromise
}

async function updateChart() {
  const option = getChartOption()
  if (!option) return

  // #ifdef H5
  nextTick(() => {
    try {
      const el = document.getElementById('weightChartH5')
      if (!el) return
      if (!chartInstance) {
        chartInstance = echarts.init(el)
      } else {
        chartInstance.resize()
      }
      chartInstance.setOption(option, true)
    } catch (err) {
      console.error('chart render failed', err)
    }
  })
  // #endif

  // #ifndef H5
  if (!chartReady) return
  try {
    const chart = await initChartOnce()
    chart.setOption(option, true)
    updateRetry = 0
  } catch (err) {
    console.error('chart render failed', err)
    if (updateRetry < 2) {
      updateRetry += 1
      scheduleChartUpdate()
    }
  }
  // #endif
}

function onChartReady() {
  chartReady = true
  updateRetry = 0
  scheduleChartUpdate()
}

watch(() => petStore.currentPetId, () => {
  resetChartState()
  showChart.value = false
  nextTick(() => {
    showChart.value = true
  })
})

watch(range, () => {
  scheduleChartUpdate()
})

watch(isDark, () => {
  scheduleChartUpdate()
})

watch(chartData, () => {
  scheduleChartUpdate()
}, { deep: true })

// #ifdef H5
onMounted(() => nextTick(() => setTimeout(updateChart, 300)))
// #endif

onShow(async () => {
  await loadPets()
})

onUnmounted(() => {
  resetChartState()
  if (chartInstance?.dispose) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>

<style lang="scss" scoped>
.summary {
  display: flex;
  gap: 20rpx;
  padding: 0 $page-padding-x 28rpx;
}

.sum-item {
  flex: 1;
  background: var(--bg-card-gradient);
  border-radius: $radius-card;
  padding: 28rpx;
  box-shadow: var(--shadow-card);
}

.sum-label {
  font-size: 22rpx;
  color: var(--text-3);
  display: block;
}

.sum-value {
  font-size: 48rpx;
  font-weight: 700;
  color: var(--text-1);
  margin-top: 4rpx;
  display: block;

  &.pri { color: var(--primary); }
}

.sum-unit {
  font-size: 28rpx;
  font-weight: 500;
}

.sum-delta {
  font-size: 22rpx;
  margin-top: 4rpx;
  display: block;

  &.up { color: var(--danger); }
  &.down { color: var(--success); }
  &.muted { color: var(--text-3); }
}

.chart-wrap {
  padding-top: 0;
  padding-bottom: 48rpx;
  margin-bottom: 32rpx;
}

.chart-tabs {
  display: flex;
  background: var(--bg-card-gradient);
  border-radius: $radius-btn;
  padding: 6rpx;
  margin-bottom: 20rpx;
  box-shadow: var(--shadow-card);
}

.chart-tab {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  font-size: 26rpx;
  color: var(--text-2);
  border-radius: 12rpx;

  &.active {
    background: var(--primary-light);
    color: var(--primary);
    font-weight: 600;
  }
}

.chart-box {
  width: 100%;
  height: 560rpx;
  background: var(--bg-card-gradient);
  border-radius: $radius-card;
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.chart-canvas {
  width: 100%;
  height: 100%;
  min-height: 280px;
}

.hist-title {
  font-size: 24rpx;
  color: var(--text-3);
  margin-bottom: 16rpx;
  display: block;
}

.hist :deep(.u-swipe-action-item) {
  margin-bottom: 12rpx;
  border-radius: $radius-card;
  overflow: hidden;
}

.hist-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  background: var(--bg-card-gradient);
  border-radius: $radius-card;
  box-shadow: var(--shadow-card);
  box-sizing: border-box;
}

.hist-info {
  flex: 1;
  min-width: 0;
}

.hist-weight {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
  color: var(--text-1);
}

.hist-date {
  display: block;
  font-size: 22rpx;
  color: var(--text-3);
  margin-top: 4rpx;
}

.hist-delta {
  font-size: 22rpx;
  font-weight: 600;
  padding: 4rpx 12rpx;
  border-radius: $radius-pill;
  flex-shrink: 0;
  margin-left: 16rpx;
  white-space: nowrap;

  &.up { color: var(--danger); background: var(--danger-light); }
  &.down { color: var(--success); background: var(--success-light); }
  &.flat { color: var(--text-3); background: var(--bg-page); }
}
</style>
