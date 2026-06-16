<template>
  <view class="review-page page-shell theme-root" :class="themeClass">
    <view class="review-page__header">
      <AppNav title="就医指南" show-back back-to-index :show-theme-toggle="true" action-text="发布" @action="goPublish" />
    </view>

    <scroll-view
      scroll-y
      class="review-page__scroll"
      :style="scrollStyle"
      :lower-threshold="120"
      @scrolltolower="loadMore"
    >
    <view class="review-page__body" :style="bodyPaddingStyle">
      <view v-if="locatedCity" class="loc-bar">
        <view class="loc-hint">
          <text>📍 定位：{{ locatedCity }}<text v-if="locatedDistrict"> · {{ locatedDistrict }}</text></text>
          <text class="loc-hint__sub">已为您选中定位城市，可下方切换其他城市</text>
        </view>
      </view>
      <view v-else class="loc-bar loc-bar--default">
        <text class="loc-hint__sub">未定位，默认展示 {{ formatCityLabel(filterCity) }} 有数据的区县</text>
      </view>

      <view v-if="showCityFilter" class="filter-bar filter-bar--city">
        <text class="filter-bar__label">城市</text>
        <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false">
          <view
            v-for="c in cityOptions"
            :key="c.value"
            class="filter-chip press-soft"
            :class="{ active: filterCity === c.value }"
            @click="onCityChange(c.value)"
          >
            {{ c.label }}
          </view>
        </scroll-view>
      </view>

      <view v-if="showDistrictFilter" class="filter-bar">
        <text class="filter-bar__label">区县</text>
        <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false">
          <view
            v-for="d in districtOptions"
            :key="d.value"
            class="filter-chip press-soft"
            :class="{ active: currentDistrict === d.value }"
            @click="onDistrictChange(d.value)"
          >
            {{ d.label }}
          </view>
        </scroll-view>
      </view>

      <view class="search-bar">
        <text class="search-bar__icon">🔍</text>
        <input
          class="search-bar__input"
          v-model="hospitalKeyword"
          type="text"
          placeholder="搜索医院名称"
          confirm-type="search"
          @confirm="onHospitalSearch"
        />
        <view v-if="hospitalKeyword" class="search-bar__clear press-soft" @click="clearHospitalSearch">×</view>
      </view>

      <view v-if="isAdmin" class="admin-bar">
        <text class="admin-bar__text">🛡️ 管理员模式 · 可编辑 / 删除任意评价</text>
        <text class="admin-bar__sub">OpenID: {{ adminOpenIdHint }}</text>
        <text v-if="writeBlocked" class="admin-bar__warn">⚠️ 数据库不可写入：{{ writeError }}</text>
      </view>

      <view v-if="!loading && (allReviews.length || dbCount > 0)" class="list-meta">
        <text>库内 {{ dbCount || allReviews.length }} 条</text>
        <text v-if="dbCount > allReviews.length"> · 已加载 {{ allReviews.length }}</text>
        <text v-if="showFilteredCount"> · 当前展示 {{ filteredList.length }}</text>
      </view>

      <view class="tab-bar">
        <view
          v-for="tab in listTabs"
          :key="tab.key"
          class="tab-item press-soft"
          :class="{ active: currentListType === tab.key, [tab.cls]: true }"
          @click="onListTypeChange(tab.key)"
        >
          {{ tab.label }}
        </view>
      </view>

      <view class="section" v-if="loading">
        <view class="loading-hint">加载中...</view>
      </view>

      <view class="section" v-else-if="loadError && !allReviews.length">
        <view class="error-box">
          <text class="error-title">⚠️ 数据加载失败</text>
          <text class="error-msg">{{ loadError }}</text>
          <text class="error-hint">环境 ID：cloud1-d7g5qwrun8a445889 · 请在微信开发者工具「云开发→设置」核对是否一致</text>
          <view class="error-retry press-soft" @click="fetchReviews">点击重试</view>
        </view>
      </view>

      <view class="section" v-else-if="!filteredList.length">
        <EmptyState
          icon="🧾"
          :title="allReviews.length ? '当前筛选无结果' : '暂无评价'"
          :desc="emptyFilterHint"
        />
        <view v-if="hasActiveFilter" class="filter-reset press-soft" @click="resetFilters">
          清除筛选条件
        </view>
        <view v-if="!filteredList.length && hasMore" class="filter-reset press-soft" @click="loadMore">
          当前筛选无结果，点击加载更多数据
        </view>
      </view>

      <view class="section review-list" v-else>
        <view
          v-for="item in filteredList"
          :key="item._id"
          class="review-card press-soft"
          :class="{
            verified: item.hasReceipt,
            'review-card--red': item.list_type === 'red',
            'review-card--black': item.list_type === 'black'
          }"
          @click="openDetail(item)"
        >
          <view class="list-type-badge" :class="item.list_type === 'red' ? 'is-red' : 'is-black'">
            <text class="list-type-badge__icon">{{ listTypeIcon(item.list_type) }}</text>
            <text class="list-type-badge__text">{{ item.list_type === 'red' ? '红榜' : '黑榜' }}</text>
          </view>
          <view class="review-card__main">
            <view class="review-card__header">
              <text class="hospital-name">{{ item.hospital_name }}</text>
              <view v-if="item.hasReceipt" class="receipt-badge">
                <text>🧾 已验单</text>
              </view>
            </view>

            <view class="tag-row">
              <text class="tag tag-loc">{{ item.city ? item.city + ' · ' : '' }}{{ item.district }} · {{ item.insurance_type }}</text>
              <text v-for="t in item.tags" :key="t" class="tag">{{ t }}</text>
            </view>

            <text class="review-content">{{ item.content }}</text>
          </view>

          <image
            v-if="canShowReceipt(item.receiptImg)"
            class="receipt-thumb"
            :src="item.receiptImg"
            mode="aspectFill"
            @click.stop="previewReceipt(item.receiptImg)"
            @error="onReceiptImgError(item.receiptImg)"
          />

          <!-- 仅管理员可见编辑 / 删除 -->
          <view v-if="isAdmin" class="admin-actions">
            <view class="admin-edit press-soft" @click.stop="onAdminEdit(item)">
              ✏️ 编辑
            </view>
            <view class="admin-delete press-soft" @click.stop="onAdminDelete(item)">
              🗑️ 删除
            </view>
          </view>
        </view>

        <view v-if="loadingMore" class="load-more">
          <text>加载中...</text>
        </view>
        <view v-else-if="hasMore" class="load-more">
          <view class="load-more__btn press-soft" @click="loadMore">
            加载更多（已加载 {{ allReviews.length }} / 库内 {{ dbCount || '?' }}）
          </view>
        </view>
        <view v-else-if="allReviews.length" class="load-more load-more--done">
          <text>— 已全部加载 {{ allReviews.length }} 条 —</text>
        </view>
      </view>

      <view class="footer-notice">
        <text class="notice-text">免责声明：本板块内容均为宠友自发上传的真实就医消费凭证及主观评价，不代表平台立场。</text>
        <text class="appeal-text">商户申诉：若认为相关评价不实，请将加盖公章的营业执照及反驳证据发送至官方邮箱：1361489750@qq.com，平台将在 3 个工作日内核实处理。</text>
      </view>
    </view>
    </scroll-view>

    <view class="review-page__footer">
      <AppTabBar current="review" embedded />
    </view>

    <view class="fab press-soft" @click="goPublish">
      <text class="fab-icon">+</text>
    </view>

    <!-- 详情底部弹窗 -->
    <view class="popup-mask" v-if="detailVisible" @click="closeDetail">
      <view class="popup-sheet detail-sheet" @click.stop>
        <view class="detail-sheet__handle" />
        <view class="detail-sheet__header">
          <text class="detail-sheet__title">{{ detailItem?.hospital_name }}</text>
          <view v-if="detailItem?.hasReceipt" class="receipt-badge">
            <text>🧾 已验单</text>
          </view>
        </view>

        <view class="detail-meta">
          <text class="detail-meta__badge" :class="detailItem?.list_type === 'red' ? 'is-red' : 'is-black'">
            {{ listTypeIcon(detailItem?.list_type) }} {{ listTypeLabel(detailItem?.list_type) }}
          </text>
          <text class="detail-meta__text">{{ detailItem?.city }} {{ detailItem?.district }}</text>
        </view>

        <view class="detail-tags" v-if="detailItem?.insurance_type || detailItem?.tags?.length">
          <text class="tag tag-loc">{{ detailItem?.insurance_type }}</text>
          <text v-for="t in detailItem?.tags" :key="t" class="tag">{{ t }}</text>
        </view>

        <scroll-view scroll-y class="detail-content-scroll">
          <text class="detail-content-full">{{ detailItem?.content }}</text>
        </scroll-view>

        <image
          v-if="canShowReceipt(detailItem?.receiptImg)"
          class="detail-receipt"
          :src="detailItem.receiptImg"
          mode="widthFix"
          @click="previewReceipt(detailItem.receiptImg)"
          @error="onReceiptImgError(detailItem.receiptImg)"
        />

        <text v-if="detailItem?.create_time" class="detail-time">
          发布于 {{ formatReviewTime(detailItem.create_time) }}
        </text>

        <view v-if="isAdmin" class="detail-admin-actions">
          <view class="detail-edit-btn press-soft" @click="onAdminEdit(detailItem)">
            ✏️ 编辑此评价
          </view>
          <view class="detail-delete-btn press-soft" @click="onAdminDelete(detailItem)">
            🗑️ 删除此评价
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import AppNav from '@/components/AppNav/index.vue'
import AppTabBar from '@/components/AppTabBar/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
import { themeClass } from '@/store/theme.js'
import { ADMIN_OPENID, listTypeLabel, listTypeIcon, formatReviewTime, REVIEW_PAGE_SIZE, DEFAULT_CITY } from '@/utils/reviewConstants.js'
import {
  fetchReviewsPage,
  fetchReviewById,
  fetchCurrentOpenId,
  adminDeleteReview,
  resolveLocationCityDistrict,
  pingCloudReviews,
  handleReviewError,
  mergeReviewLists
} from '@/cloud/review.js'
import {
  filterReviews,
  normalizeReview,
  getDistrictOptionsForReviews,
  getCityOptionsForReviews
} from '@/utils/reviewFilter.js'
import { getCachedGeo } from '@/utils/location.js'

const loading = ref(true)
const allReviews = ref([])
const loadError = ref('')
const locatedCity = ref('')
const locatedDistrict = ref('')
const filterCity = ref(DEFAULT_CITY)
const currentDistrict = ref('全部区县')
const currentListType = ref('all')
const hospitalKeyword = ref('')
const currentOpenId = ref('')
const detailVisible = ref(false)
const detailItem = ref(null)
const brokenReceiptUrls = ref(new Set())
const writeBlocked = ref(false)
const writeError = ref('')
const dbCount = ref(0)
const hasMore = ref(true)
const loadingMore = ref(false)
const pageSkip = ref(0)
const scrollStyle = ref(calcScrollStyle())
const bodyPaddingStyle = ref(calcBodyPaddingStyle())
const lastPublishedAt = ref(0)

const listTabs = [
  { key: 'all', label: '全部', cls: '' },
  { key: 'red', label: '🟢 宠友红榜', cls: 'tab-red' },
  { key: 'black', label: '⚫ 商家黑榜', cls: 'tab-black' }
]

const isAdmin = computed(() => currentOpenId.value === ADMIN_OPENID)

const adminOpenIdHint = computed(() => {
  if (!currentOpenId.value) return '未获取（请先创建宠物档案）'
  return `${currentOpenId.value.slice(0, 12)}...`
})

const cityOptions = computed(() =>
  getCityOptionsForReviews(allReviews.value, { defaultCity: DEFAULT_CITY })
)

const districtOptions = computed(() =>
  getDistrictOptionsForReviews(allReviews.value, filterCity.value)
)

const showCityFilter = computed(() => cityOptions.value.length > 0)

const showDistrictFilter = computed(
  () => filterCity.value && filterCity.value !== '全部城市' && districtOptions.value.length > 1
)

const filteredList = computed(() =>
  filterReviews(allReviews.value, {
    city: filterCity.value,
    filterByCity: !!filterCity.value && filterCity.value !== '全部城市',
    district: currentDistrict.value,
    listType: currentListType.value,
    hospitalName: hospitalKeyword.value
  })
)

const showFilteredCount = computed(
  () => filteredList.value.length !== allReviews.value.length || hasActiveFilter.value
)

const hasActiveFilter = computed(() => {
  const baseCity = locatedCity.value || DEFAULT_CITY
  return (
    !!hospitalKeyword.value.trim() ||
    currentDistrict.value !== '全部区县' ||
    currentListType.value !== 'all' ||
    filterCity.value === '全部城市' ||
    (filterCity.value && filterCity.value !== baseCity)
  )
})

const emptyFilterHint = computed(() => {
  if (!allReviews.value.length) return '成为第一个分享真实验单的宠友吧'
  const parts = []
  if (hospitalKeyword.value.trim()) parts.push(`医院「${hospitalKeyword.value.trim()}」`)
  if (filterCity.value && filterCity.value !== '全部城市') {
    parts.unshift(`城市「${formatCityLabel(filterCity.value)}」`)
  }
  if (currentDistrict.value !== '全部区县') {
    const opt = districtOptions.value.find((o) => o.value === currentDistrict.value)
    parts.push(`区县「${opt?.label || currentDistrict.value}」`)
  }
  if (currentListType.value !== 'all') {
    parts.push(currentListType.value === 'red' ? '宠友红榜' : '商家黑榜')
  }
  if (parts.length) return `当前 ${parts.join(' · ')} 无匹配，可清除筛选或加载更多`
  return '试试切换区县、榜单或搜索医院名称'
})

watch(districtOptions, (opts) => {
  const values = opts.map((o) => o.value)
  if (values.length && !values.includes(currentDistrict.value)) {
    currentDistrict.value = '全部区县'
  }
  if (!values.length) {
    currentDistrict.value = '全部区县'
  }
})

function formatCityLabel(city) {
  if (!city || city === '全部城市') return '全部'
  return String(city).replace(/市$/, '')
}

function onCityChange(city) {
  if (filterCity.value === city) return
  filterCity.value = city
  currentDistrict.value = '全部区县'
}

watch(filterCity, () => {
  currentDistrict.value = '全部区县'
})

function onDistrictChange(d) {
  currentDistrict.value = d
}

function onListTypeChange(key) {
  currentListType.value = key
}

function onHospitalSearch() {
  // confirm-type="search" 触发，computed 已自动过滤
}

function clearHospitalSearch() {
  hospitalKeyword.value = ''
}

function openDetail(item) {
  detailItem.value = item
  detailVisible.value = true
}

function closeDetail() {
  detailVisible.value = false
  detailItem.value = null
}

function calcLayoutMetrics() {
  try {
    const sys = uni.getSystemInfoSync()
    const rate = sys.windowWidth / 750
    const navH = Math.round(88 * rate) + (sys.statusBarHeight || 0)
    const tabH = Math.round(100 * rate)
    const safeBottom = sys.safeAreaInsets?.bottom ?? 0
    return { navH, tabH, safeBottom, windowH: sys.windowHeight }
  } catch (_) {
    return { navH: 88, tabH: 100, safeBottom: 0, windowH: 667 }
  }
}

function calcScrollStyle() {
  const { navH, tabH, safeBottom, windowH } = calcLayoutMetrics()
  return { height: `${windowH - navH}px`, marginTop: `${navH}px` }
}

function calcBodyPaddingStyle() {
  const { tabH, safeBottom } = calcLayoutMetrics()
  return {
    paddingBottom: `${tabH + safeBottom + 16}px`,
    boxSizing: 'border-box'
  }
}

async function initLocation({ force = false } = {}) {
  try {
    const geo = await resolveLocationCityDistrict({ force })
    applyLocatedGeo(geo)
  } catch (err) {
    console.warn('[review] initLocation failed:', err)
    locatedCity.value = ''
    locatedDistrict.value = ''
    filterCity.value = DEFAULT_CITY
  }
}

function applyLocatedGeo(geo) {
  if (geo?.city) {
    locatedCity.value = geo.city
    locatedDistrict.value = geo.district || ''
    filterCity.value = geo.city
    return
  }
  locatedCity.value = ''
  locatedDistrict.value = ''
  filterCity.value = DEFAULT_CITY
}

function applyCachedLocationIfAny() {
  const cached = getCachedGeo()
  if (cached?.city) {
    applyLocatedGeo({ city: cached.city, district: cached.district })
  }
}

function onGeoCityReady(payload) {
  if (!payload?.city) return
  applyLocatedGeo(payload)
}

function startLocationUpdate() {
  initLocation({ force: false }).catch((err) => {
    console.warn('[review] background location failed:', err)
  })
}

function mergeReviewIntoList(doc) {
  if (!doc?._id) return
  const normalized = normalizeReview(doc)
  if (!normalized || normalized._id === undefined) return
  const idx = allReviews.value.findIndex((r) => r._id === normalized._id)
  if (idx >= 0) {
    const next = [...allReviews.value]
    next[idx] = normalized
    allReviews.value = next
  } else {
    allReviews.value = [normalized, ...allReviews.value]
  }
}

async function fetchReviews({ silent = false, reset = true } = {}) {
  if (!silent && reset) {
    loading.value = true
    loadError.value = ''
  }
  if (reset) {
    hasMore.value = true
    pageSkip.value = 0
  }
  const prevList = allReviews.value
  try {
    if (reset) {
      const ping = await pingCloudReviews()
      writeBlocked.value = !ping.writeOk
      writeError.value = ping.writeError || ''
      dbCount.value = ping.count || 0

      if (!ping.ok) {
        if (!silent) {
          loadError.value = ping.error
          allReviews.value = []
          hasMore.value = false
          uni.showToast({ title: (ping.error || '云数据库不可用').slice(0, 36), icon: 'none', duration: 4000 })
        }
        return
      }
    }

    const { list, error, dbCount: fetchedCount, hasMore: more, rawCount } = await fetchReviewsPage({
      limit: REVIEW_PAGE_SIZE,
      skip: pageSkip.value,
      withCount: reset
    })
    if (typeof fetchedCount === 'number') {
      dbCount.value = fetchedCount
    }

    if (reset) {
      allReviews.value = mergeReviewLists(list, silent ? prevList : [])
    } else {
      allReviews.value = mergeReviewLists(list, allReviews.value)
    }

    pageSkip.value += rawCount || 0
    if (!rawCount) {
      hasMore.value = false
    } else {
      hasMore.value =
        typeof dbCount.value === 'number' && dbCount.value > 0
          ? pageSkip.value < dbCount.value
          : more
    }

    if (!silent) {
      loadError.value = error
    }
    console.log('[review] ui list:', allReviews.value.length, 'dbCount:', dbCount.value, 'skip:', pageSkip.value, 'hasMore:', hasMore.value)
    if (!silent && error && !allReviews.value.length) {
      uni.showToast({ title: error.slice(0, 30), icon: 'none', duration: 3000 })
    }
  } catch (err) {
    if (!silent) {
      loadError.value = err?.message || '加载评价失败'
      allReviews.value = []
      hasMore.value = false
      handleReviewError(err, '加载评价失败')
    }
  } finally {
    if (!silent && reset) {
      loading.value = false
    }
  }
}

async function loadMore() {
  if (loading.value || loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    await fetchReviews({ silent: true, reset: false })
  } finally {
    loadingMore.value = false
  }
}

async function initOpenId() {
  currentOpenId.value = await fetchCurrentOpenId()
}

function previewReceipt(url) {
  if (!url || brokenReceiptUrls.value.has(url)) return
  uni.previewImage({ urls: [url], current: url })
}

function canShowReceipt(url) {
  return !!url && !brokenReceiptUrls.value.has(url)
}

function onReceiptImgError(url) {
  if (!url) return
  brokenReceiptUrls.value = new Set([...brokenReceiptUrls.value, url])
}

function goPublish() {
  uni.navigateTo({ url: '/pages/review/publish' })
}

function onAdminEdit(item) {
  if (!item?._id) {
    uni.showToast({ title: '无效的评价 ID', icon: 'none' })
    return
  }
  closeDetail()
  uni.navigateTo({ url: `/pages/review/publish?id=${item._id}` })
}

async function onAdminDelete(item) {
  if (!item?._id) {
    uni.showToast({ title: '无效的评价 ID', icon: 'none' })
    return
  }
  uni.showModal({
    title: '确认删除',
    content: `确定删除「${item.hospital_name}」的评价？此操作不可恢复。`,
    confirmColor: '#f87171',
    success: async (res) => {
      if (!res.confirm) return
      try {
        uni.showLoading({ title: '删除中...', mask: true })
        await adminDeleteReview(item._id, { verifiedAdmin: isAdmin.value })
        uni.hideLoading()
        uni.showToast({ title: '已删除', icon: 'success' })
        closeDetail()
        await fetchReviews()
      } catch (err) {
        uni.hideLoading()
        const msg = err?.message || err?.errMsg || '删除失败'
        uni.showToast({ title: msg.slice(0, 60), icon: 'none', duration: 4000 })
      }
    }
  })
}

onShow(async () => {
  applyCachedLocationIfAny()
  // 定位与拉列表并行，避免 getLocation / 逆地理阻塞数据加载
  startLocationUpdate()
  if (Date.now() - lastPublishedAt.value < 2500) {
    await initOpenId()
    return
  }
  await Promise.all([fetchReviews(), initOpenId()])
})

function resetFilters() {
  filterCity.value = locatedCity.value || DEFAULT_CITY
  currentDistrict.value = '全部区县'
  currentListType.value = 'all'
  hospitalKeyword.value = ''
}

async function onReviewPublished(payload) {
  lastPublishedAt.value = Date.now()
  resetFilters()
  const doc = payload?.doc
  const id = payload?.id
  if (doc) {
    mergeReviewIntoList(doc)
  } else if (id) {
    const fetched = await fetchReviewById(id)
    if (fetched) mergeReviewIntoList(fetched)
  }
  // 静默刷新：不触发 loading 遮罩，且合并而非覆盖
  fetchReviews({ silent: true })
}

async function onReviewUpdated(payload) {
  lastPublishedAt.value = Date.now()
  const doc = payload?.doc
  const id = payload?.id
  if (doc) {
    mergeReviewIntoList(doc)
  } else if (id) {
    const fetched = await fetchReviewById(id)
    if (fetched) mergeReviewIntoList(fetched)
  }
  fetchReviews({ silent: true })
}

onMounted(() => {
  uni.$on('review-published', onReviewPublished)
  uni.$on('review-updated', onReviewUpdated)
  uni.$on('geo-city-ready', onGeoCityReady)
})

onUnmounted(() => {
  uni.$off('review-published', onReviewPublished)
  uni.$off('review-updated', onReviewUpdated)
  uni.$off('geo-city-ready', onGeoCityReady)
})

onPullDownRefresh(async () => {
  try {
    await fetchReviews({ reset: true })
  } finally {
    uni.stopPullDownRefresh()
  }
})
</script>

<style lang="scss" scoped>
.review-page {
  position: relative;
}

.review-page__header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
}

.review-page__scroll {
  width: 100%;
  box-sizing: border-box;
}

.review-page__body {
  width: 100%;
}

.review-page__footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

.search-bar {
  display: flex;
  align-items: center;
  margin: 8rpx 28rpx 12rpx;
  padding: 0 24rpx;
  height: 72rpx;
  border-radius: 36rpx;
  background: var(--bg-card, #fff);
  border: 1rpx solid var(--border, #e8e8e8);
}

.search-bar__icon {
  font-size: 28rpx;
  margin-right: 12rpx;
  flex-shrink: 0;
}

.search-bar__input {
  flex: 1;
  font-size: 28rpx;
  color: var(--text-1);
  height: 72rpx;
}

.search-bar__clear {
  width: 44rpx;
  height: 44rpx;
  line-height: 40rpx;
  text-align: center;
  font-size: 36rpx;
  color: var(--text-4);
  flex-shrink: 0;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 28rpx 8rpx;
}

.filter-bar__label {
  flex-shrink: 0;
  font-size: 24rpx;
  color: var(--text-3);
  width: 56rpx;
}

.filter-bar .filter-scroll {
  flex: 1;
  min-width: 0;
}

.loc-bar--default {
  padding: 8rpx 28rpx;
}

.loc-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  padding: 0 28rpx 8rpx;
}

.loc-hint {
  flex: 1;
  min-width: 0;
  font-size: 22rpx;
  color: var(--text-3);
}

.loc-toggle {
  flex-shrink: 0;
  padding: 8rpx 20rpx;
  border-radius: 24rpx;
  font-size: 22rpx;
  color: var(--primary);
  background: var(--primary-light, rgba(88, 193, 108, 0.12));
  border: 1rpx solid var(--primary);
  white-space: nowrap;
}

.loc-toggle.active {
  color: var(--text-2);
  background: var(--bg-card, #fff);
  border-color: var(--border, #e8e8e8);
}

.loc-hint__sub {
  display: block;
  margin-top: 4rpx;
  color: var(--text-4);
  font-size: 20rpx;
  line-height: 1.4;
}

.admin-bar {
  margin: 0 28rpx 8rpx;
  padding: 12rpx 24rpx;
  border-radius: 16rpx;
  background: var(--danger-light);
  border: 1rpx solid var(--danger);
  text-align: center;
}

.admin-bar__text {
  font-size: 22rpx;
  color: var(--danger);
  font-weight: 600;
}

.admin-bar__sub {
  display: block;
  margin-top: 4rpx;
  font-size: 20rpx;
  color: var(--text-4);
}

.admin-bar__warn {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  color: var(--danger);
  line-height: 1.4;
}

.filter-scroll {
  white-space: nowrap;
  padding: 0 28rpx;
}

.filter-chip {
  display: inline-block;
  padding: 12rpx 28rpx;
  margin-right: 16rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: var(--text-3);
  background: var(--bg-input);
  border: 1rpx solid var(--border);
  transition: all 0.25s ease;

  &.active {
    color: var(--primary);
    background: var(--primary-light);
    border-color: var(--primary);
  }
}

.tab-bar {
  display: flex;
  gap: 12rpx;
  padding: 12rpx 28rpx 20rpx;
}

.list-meta {
  padding: 0 28rpx 8rpx;
  font-size: 22rpx;
  color: var(--text-4);
}

.list-meta__hint {
  color: var(--primary);
}

.filter-reset {
  margin-top: 24rpx;
  text-align: center;
  font-size: 26rpx;
  color: var(--primary);
  padding: 16rpx 32rpx;
}

.load-more {
  padding: 32rpx 0 16rpx;
  text-align: center;
  font-size: 24rpx;
  color: var(--text-muted, #999);
}

.load-more--done {
  color: var(--text-muted, #bbb);
}

.load-more__btn {
  display: inline-block;
  padding: 16rpx 40rpx;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: var(--primary);
  background: var(--primary-light, rgba(88, 193, 108, 0.12));
  border: 1rpx solid var(--primary);
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 16rpx 8rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: var(--text-3);
  background: var(--bg-input);
  border: 1rpx solid var(--border);
  transition: all 0.25s ease;

  &.active {
    font-weight: 600;
    color: var(--text-1);
    background: var(--bg-card);
    box-shadow: var(--shadow-card);
  }

  &.tab-red.active {
    color: var(--success);
    border-color: rgba(74, 222, 128, 0.4);
    background: var(--success-light);
  }

  &.tab-black.active {
    color: var(--text-2);
    border-color: var(--border);
    background: rgba(60, 60, 70, 0.5);
  }
}

.loading-hint {
  text-align: center;
  padding: 80rpx;
  color: var(--text-3);
  font-size: 28rpx;
}

.error-box {
  padding: 40rpx 32rpx;
  border-radius: 24rpx;
  background: var(--danger-light);
  border: 1rpx solid var(--danger);
  text-align: center;
}

.error-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--danger);
  margin-bottom: 16rpx;
}

.error-msg {
  display: block;
  font-size: 24rpx;
  color: var(--text-2);
  line-height: 1.5;
  margin-bottom: 16rpx;
  word-break: break-all;
}

.error-hint {
  display: block;
  font-size: 22rpx;
  color: var(--text-3);
  line-height: 1.6;
  margin-bottom: 24rpx;
}

.error-retry {
  display: inline-block;
  padding: 16rpx 48rpx;
  border-radius: 999rpx;
  background: var(--primary);
  color: var(--on-primary);
  font-size: 26rpx;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.review-card {
  position: relative;
  display: flex;
  gap: 16rpx;
  padding: 28rpx;
  border-radius: 28rpx;
  background: var(--bg-card-gradient);
  border: 1rpx solid var(--border);
  box-shadow: var(--shadow-card);

  &.review-card--red {
    border-left: 8rpx solid rgba(74, 222, 128, 0.85);
  }

  &.review-card--black {
    border-left: 8rpx solid rgba(120, 120, 130, 0.9);
  }

  &.verified {
    border-color: rgba(74, 222, 128, 0.25);
    box-shadow: var(--shadow-card), 0 0 24rpx rgba(74, 222, 128, 0.08);
  }
}

.list-type-badge {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  gap: 4rpx;
}

.list-type-badge__icon {
  font-size: 32rpx;
  line-height: 1;
}

.list-type-badge__text {
  font-size: 18rpx;
  font-weight: 600;
}

.list-type-badge.is-red .list-type-badge__text {
  color: var(--success, #4ade80);
}

.list-type-badge.is-black .list-type-badge__text {
  color: var(--text-3, #888);
}

.review-card__main {
  flex: 1;
  min-width: 0;
}

.review-card__header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
  margin-bottom: 12rpx;
}

.hospital-name {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-1);
}

.receipt-badge {
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  color: var(--success);
  background: var(--success-light);
  box-shadow: 0 0 12rpx rgba(74, 222, 128, 0.35);
}

.tag-row,
.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-bottom: 12rpx;
}

.tag {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  color: var(--text-3);
  background: var(--bg-input);

  &.tag-loc {
    color: var(--primary);
    background: var(--primary-light);
  }
}

.review-content {
  font-size: 26rpx;
  color: var(--text-2);
  line-height: 1.55;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  word-break: break-all;
}

.receipt-thumb {
  width: 120rpx;
  height: 120rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
  border: 1rpx solid var(--border);
}

.admin-actions {
  position: absolute;
  right: 20rpx;
  bottom: 16rpx;
  display: flex;
  gap: 12rpx;
}

.admin-edit,
.admin-delete {
  font-size: 22rpx;
  padding: 6rpx 14rpx;
  border-radius: 12rpx;
}

.admin-edit {
  color: var(--primary);
  background: var(--primary-light);
}

.admin-delete {
  color: var(--danger);
  background: var(--danger-light);
}

.fab {
  position: fixed;
  right: 40rpx;
  bottom: calc(120rpx + env(safe-area-inset-bottom));
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-soft);
  z-index: 998;
}

.fab-icon {
  font-size: 48rpx;
  color: var(--on-primary);
  line-height: 1;
  margin-top: -4rpx;
}

.footer-notice {
  padding: 40rpx;
  text-align: center;
  background: rgba(20, 20, 25, 0.4);
}

.notice-text,
.appeal-text {
  display: block;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.3);
  line-height: 1.6;
  margin-bottom: 10rpx;
}

.theme-light {
  .footer-notice {
    background: rgba(245, 247, 250, 0.6);
  }

  .notice-text,
  .appeal-text {
    color: rgba(96, 98, 102, 0.45);
  }
}

/* 底部详情弹窗 */
.popup-mask {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  z-index: 1001;
  display: flex;
  align-items: flex-end;
}

.popup-sheet {
  width: 100%;
  background: var(--bg-card);
  border-radius: 32rpx 32rpx 0 0;
  padding: 24rpx 32rpx calc(48rpx + env(safe-area-inset-bottom));
  max-height: 82vh;
  box-sizing: border-box;
}

.detail-sheet__handle {
  width: 64rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: var(--divider);
  margin: 0 auto 24rpx;
}

.detail-sheet__header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
  margin-bottom: 16rpx;
}

.detail-sheet__title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--text-1);
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
  flex-wrap: wrap;
}

.detail-meta__badge {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-weight: 600;

  &.is-red {
    color: var(--success);
    background: var(--success-light);
  }

  &.is-black {
    color: var(--text-2);
    background: var(--bg-input);
  }
}

.detail-meta__text {
  font-size: 24rpx;
  color: var(--text-3);
}

.detail-content-scroll {
  max-height: 320rpx;
  margin-bottom: 20rpx;
}

.detail-content-full {
  font-size: 28rpx;
  color: var(--text-2);
  line-height: 1.65;
  word-break: break-all;
  white-space: pre-wrap;
}

.detail-receipt {
  width: 100%;
  border-radius: 20rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid var(--border);
}

.detail-time {
  display: block;
  font-size: 22rpx;
  color: var(--text-4);
  margin-bottom: 24rpx;
}

.detail-admin-actions {
  padding-top: 8rpx;
  border-top: 1rpx solid var(--divider);
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.detail-edit-btn,
.detail-delete-btn {
  text-align: center;
  padding: 24rpx;
  border-radius: 20rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.detail-edit-btn {
  color: var(--primary);
  background: var(--primary-light);
}

.detail-delete-btn {
  color: var(--danger);
  background: var(--danger-light);
}
</style>
