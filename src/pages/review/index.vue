<template>
  <view class="review-page page-shell theme-root" :class="themeClass">
    <view class="review-page__header">
      <AppNav title="就医指南" show-back back-to-index :show-theme-toggle="true" action-text="发布" @action="goPublish" />
    </view>

    <view class="review-page__body" :style="bodyStyle">
      <view v-if="currentCity" class="loc-hint">
        <text>📍 定位城市：{{ currentCity }}</text>
        <text class="loc-hint__sub"> · 下方可点区县筛选，默认「全部区县」看全国</text>
      </view>

      <view class="filter-bar">
        <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false">
          <view
            v-for="d in districtOptions"
            :key="d"
            class="filter-chip press-soft"
            :class="{ active: currentDistrict === d }"
            @click="onDistrictChange(d)"
          >
            {{ d }}
          </view>
        </scroll-view>
      </view>

      <view v-if="isAdmin" class="admin-bar">
        <text class="admin-bar__text">🛡️ 管理员模式 · 可编辑 / 删除任意评价</text>
        <text class="admin-bar__sub">OpenID: {{ adminOpenIdHint }}</text>
        <text v-if="writeBlocked" class="admin-bar__warn">⚠️ 数据库不可写入：{{ writeError }}</text>
      </view>

      <view v-if="!loading && (allReviews.length || dbCount > 0)" class="list-meta">
        <text>共 {{ allReviews.length || dbCount }} 条</text>
        <text v-if="dbCount > allReviews.length"> · 云库 {{ dbCount }} 条</text>
        <text v-if="filteredList.length !== allReviews.length"> · 当前筛选 {{ filteredList.length }} 条</text>
        <text v-if="filteredList.length !== allReviews.length" class="list-meta__hint">（可点「全部区县」查看全部）</text>
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
        <view v-if="allReviews.length && currentDistrict !== '全部区县'" class="filter-reset press-soft" @click="resetFilters">
          查看全部区县（共 {{ allReviews.length }} 条）
        </view>
      </view>

      <view class="section review-list" v-else>
        <view
          v-for="item in filteredList"
          :key="item._id"
          class="review-card press-soft"
          :class="{ verified: item.hasReceipt }"
          @click="openDetail(item)"
        >
          <view class="review-card__main">
            <view class="review-card__header">
              <text class="hospital-name">{{ item.hospital_name }}</text>
              <view v-if="item.hasReceipt" class="receipt-badge">
                <text>🧾 已验单</text>
              </view>
            </view>

            <view class="tag-row">
              <text class="tag tag-loc">{{ item.district }} · {{ item.insurance_type }}</text>
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
      </view>

      <view class="footer-notice">
        <text class="notice-text">免责声明：本板块内容均为宠友自发上传的真实就医消费凭证及主观评价，不代表平台立场。</text>
        <text class="appeal-text">商户申诉：若认为相关评价不实，请将加盖公章的营业执照及反驳证据发送至官方邮箱：1361489750@qq.com，平台将在 3 个工作日内核实处理。</text>
      </view>
    </view>

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
            {{ listTypeLabel(detailItem?.list_type) }}
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppNav from '@/components/AppNav/index.vue'
import AppTabBar from '@/components/AppTabBar/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
import { themeClass } from '@/store/theme.js'
import { ADMIN_OPENID, listTypeLabel, formatReviewTime, DEFAULT_CITY } from '@/utils/reviewConstants.js'
import {
  fetchAllReviews,
  fetchReviewById,
  fetchCurrentOpenId,
  adminDeleteReview,
  resolveLocationCityDistrict,
  pingCloudReviews,
  handleReviewError,
  mergeReviewLists
} from '@/cloud/review.js'
import { filterReviews, normalizeReview, getDistrictOptionsForReviews } from '@/utils/reviewFilter.js'

const loading = ref(true)
const allReviews = ref([])
const loadError = ref('')
const currentCity = ref('')
const currentDistrict = ref('全部区县')
const currentListType = ref('all')
const currentOpenId = ref('')
const detailVisible = ref(false)
const detailItem = ref(null)
const brokenReceiptUrls = ref(new Set())
const writeBlocked = ref(false)
const writeError = ref('')
const dbCount = ref(0)
const bodyStyle = ref(calcBodyStyle())
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

const districtOptions = computed(() =>
  getDistrictOptionsForReviews(allReviews.value, currentCity.value, DEFAULT_CITY)
)

const filteredList = computed(() =>
  filterReviews(allReviews.value, {
    district: currentDistrict.value,
    listType: currentListType.value
  })
)

const emptyFilterHint = computed(() => {
  if (!allReviews.value.length) return '成为第一个分享真实验单的宠友吧'
  const parts = []
  if (currentDistrict.value !== '全部区县') parts.push(`区县「${currentDistrict.value}」`)
  if (currentListType.value !== 'all') {
    parts.push(currentListType.value === 'red' ? '宠友红榜' : '商家黑榜')
  }
  if (parts.length) return `已加载 ${allReviews.value.length} 条，当前筛选 ${parts.join(' + ')} 无匹配`
  return '试试切换区县或榜单类型'
})

function onDistrictChange(d) {
  currentDistrict.value = d
}

function onListTypeChange(key) {
  currentListType.value = key
}

function openDetail(item) {
  detailItem.value = item
  detailVisible.value = true
}

function closeDetail() {
  detailVisible.value = false
  detailItem.value = null
}

function calcBodyStyle() {
  try {
    const sys = uni.getSystemInfoSync()
    const rate = sys.windowWidth / 750
    const navH = Math.round(88 * rate) + (sys.statusBarHeight || 0)
    const tabH = Math.round(100 * rate)
    const safeBottom = sys.safeAreaInsets?.bottom ?? 0
    return {
      paddingTop: `${navH}px`,
      paddingBottom: `${tabH + safeBottom}px`,
      minHeight: `${sys.windowHeight}px`,
      boxSizing: 'border-box'
    }
  } catch (_) {
    return { paddingTop: '88px', paddingBottom: '100px', minHeight: '100vh', boxSizing: 'border-box' }
  }
}

async function initLocation() {
  try {
    const geo = await resolveLocationCityDistrict()
    currentCity.value = geo.city || ''
  } catch (err) {
    console.warn('[review] initLocation failed:', err)
    currentCity.value = ''
  }
}

function startLocationUpdate() {
  initLocation().catch((err) => {
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

async function fetchReviews({ silent = false } = {}) {
  if (!silent) {
    loading.value = true
    loadError.value = ''
  }
  const prevList = allReviews.value
  try {
    const ping = await pingCloudReviews()
    writeBlocked.value = !ping.writeOk
    writeError.value = ping.writeError || ''
    dbCount.value = ping.count || 0

    if (!ping.ok) {
      if (!silent) {
        loadError.value = ping.error
        allReviews.value = []
        uni.showToast({ title: (ping.error || '云数据库不可用').slice(0, 36), icon: 'none', duration: 4000 })
      }
      return
    }

    const { list, error, dbCount: fetchedCount } = await fetchAllReviews()
    if (typeof fetchedCount === 'number') {
      dbCount.value = fetchedCount
    }
    allReviews.value = mergeReviewLists(list, silent ? prevList : [])
    if (!silent) {
      loadError.value = error
    }
    console.log('[review] ui list:', allReviews.value.length, 'dbCount:', dbCount.value, 'filter:', currentDistrict.value, currentListType.value)
    if (!silent && error && !allReviews.value.length) {
      uni.showToast({ title: error.slice(0, 30), icon: 'none', duration: 3000 })
    }
  } catch (err) {
    if (!silent) {
      loadError.value = err?.message || '加载评价失败'
      allReviews.value = []
      handleReviewError(err, '加载评价失败')
    }
  } finally {
    if (!silent) {
      loading.value = false
    }
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
  // 定位与拉列表并行，避免 getLocation / 逆地理阻塞数据加载
  startLocationUpdate()
  if (Date.now() - lastPublishedAt.value < 2500) {
    await initOpenId()
    return
  }
  await Promise.all([fetchReviews(), initOpenId()])
})

function resetFilters() {
  currentDistrict.value = '全部区县'
  currentListType.value = 'all'
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
})

onUnmounted(() => {
  uni.$off('review-published', onReviewPublished)
  uni.$off('review-updated', onReviewUpdated)
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

.filter-bar {
  padding: 16rpx 0 8rpx;
}

.loc-hint {
  padding: 0 28rpx 8rpx;
  font-size: 22rpx;
  color: var(--text-3);
}

.loc-hint__sub {
  color: var(--text-4);
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
  gap: 20rpx;
  padding: 28rpx;
  border-radius: 28rpx;
  background: var(--bg-card-gradient);
  border: 1rpx solid var(--border);
  box-shadow: var(--shadow-card);

  &.verified {
    border-color: rgba(74, 222, 128, 0.25);
    box-shadow: var(--shadow-card), 0 0 24rpx rgba(74, 222, 128, 0.08);
  }
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
