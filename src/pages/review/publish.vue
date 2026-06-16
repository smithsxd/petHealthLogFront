<template>
  <view class="publish-page page-shell theme-root" :class="themeClass">
    <AppNav :title="pageTitle" show-back :show-theme-toggle="true" />

    <view class="section">
      <!-- 定位 / 手动选择城市区县 -->
      <view class="loc-bar card">
        <text class="loc-icon">📍</text>
        <view class="loc-info">
          <text class="loc-text" v-if="locating">定位中...</text>
          <text class="loc-text" v-else-if="locFailed">定位不可用，请手动选择</text>
          <text class="loc-text" v-else>{{ city }} {{ district }}</text>
          <text class="loc-sub" v-if="locFailed">开发者工具通常无法定位，手动选择即可</text>
        </view>
        <text class="loc-retry press-soft" @click="tryLocate">重新定位</text>
      </view>
      <view class="form-row loc-pickers">
        <view class="form-item">
          <text class="form-label">城市</text>
          <picker :range="cityList" :value="cityIndex" @change="onCityPick">
            <view class="picker-cell">
              <text class="picker-cell-text">{{ city || '请选择城市' }}</text>
              <text class="picker-cell-arrow">▾</text>
            </view>
          </picker>
        </view>
        <view class="form-item">
          <text class="form-label">区县</text>
          <picker :range="districtList" :value="districtIndex" @change="onDistrictPick">
            <view class="picker-cell">
              <text class="picker-cell-text">{{ district || '请选择区县' }}</text>
              <text class="picker-cell-arrow">▾</text>
            </view>
          </picker>
        </view>
      </view>
    </view>

    <!-- 红黑榜选择 -->
    <view class="section">
      <text class="form-label">榜单类型</text>
      <view class="list-type-row">
        <view
          class="list-type-btn press-soft"
          :class="{ active: listType === 'red', red: true }"
          @click="switchListType('red')"
        >
          🟢 宠友红榜
        </view>
        <view
          class="list-type-btn press-soft"
          :class="{ active: listType === 'black', black: true }"
          @click="switchListType('black')"
        >
          ⚫ 商家黑榜
        </view>
      </view>
    </view>

    <!-- 医院名称 -->
    <view class="section">
      <view class="form-item">
        <text class="form-label">医院名称</text>
        <input class="form-input" v-model="hospitalName" placeholder="请输入宠物医院名称" />
      </view>
    </view>

    <!-- 医保类型 -->
    <view class="section">
      <text class="form-label">医保类型</text>
      <view class="badge-row">
        <view
          v-for="ins in INSURANCE_TYPES"
          :key="ins"
          class="ins-badge press-soft"
          :class="{ active: insuranceType === ins }"
          @click="insuranceType = ins"
        >
          {{ ins }}
        </view>
      </view>
    </view>

    <!-- 动态标签池 -->
    <view class="section">
      <text class="form-label">选择标签（最多 3 个）</text>
      <view class="badge-row">
        <view
          v-for="tag in currentTags"
          :key="tag"
          class="tag-badge press-soft"
          :class="{ active: selectedTags.includes(tag), breathing: selectedTags.includes(tag) }"
          @click="toggleTag(tag)"
        >
          {{ tag }}
        </view>
      </view>
    </view>

    <!-- 评价正文 -->
    <view class="section">
      <view class="form-item">
        <text class="form-label">评价内容</text>
        <textarea
          class="form-textarea"
          v-model="content"
          placeholder="分享你的真实就医体验..."
          maxlength="500"
          :auto-height="true"
        />
      </view>
    </view>

    <!-- 验单图片 -->
    <view class="section">
      <text class="form-label">上传验单（发票/单据，可选）</text>
      <view class="upload-area press-soft" @click="chooseReceipt">
        <image v-if="receiptPreview" class="upload-preview" :src="receiptPreview" mode="aspectFill" />
        <view v-else class="upload-placeholder">
          <text class="upload-icon">📷</text>
          <text class="upload-hint">点击上传发票/单据</text>
          <text class="upload-sub">Canvas 自动压缩至 ~150KB</text>
        </view>
      </view>
    </view>

    <!-- 发布按钮 -->
    <view class="section">
      <view class="btn-primary" :class="{ disabled: submitting }" @click="submit">
        {{ submitting ? (isEditMode ? '保存中...' : '发布中...') : (isEditMode ? '保存修改' : '发布评价') }}
      </view>
    </view>

    <!-- 隐藏 Canvas 用于压图 -->
    <canvas
      :canvas-id="CANVAS_ID"
      :id="CANVAS_ID"
      class="hidden-canvas"
      :style="{ width: canvasW + 'px', height: canvasH + 'px' }"
    />
  </view>
</template>

<script setup>
import { ref, computed, getCurrentInstance } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppNav from '@/components/AppNav/index.vue'
import { themeClass } from '@/store/theme.js'
import { INSURANCE_TYPES, RED_TAGS, BLACK_TAGS, getCityList, getDistrictsForCity, DEFAULT_CITY, DEFAULT_DISTRICT, ADMIN_OPENID } from '@/utils/reviewConstants.js'
import { compressReceiptImage, CANVAS_ID } from '@/utils/receiptCompress.js'
import {
  resolveLocationCityDistrict,
  uploadReceiptImage,
  publishReview,
  adminUpdateReview,
  fetchReviewById,
  fetchCurrentOpenId,
  handleReviewError
} from '@/cloud/review.js'

const instance = getCurrentInstance()

const editId = ref('')
const existingReceiptCloudId = ref('')
const pageLoading = ref(false)
const isEditMode = computed(() => !!editId.value)
const pageTitle = computed(() => (isEditMode.value ? '编辑评价' : '发布评价'))

const city = ref('')
const district = ref('')
const locating = ref(true)
const locFailed = ref(false)
const cityList = getCityList()
const cityIndex = ref(Math.max(0, cityList.indexOf(DEFAULT_CITY)))
const districtList = ref(getDistrictsForCity(DEFAULT_CITY))
const districtIndex = ref(Math.max(0, getDistrictsForCity(DEFAULT_CITY).indexOf(DEFAULT_DISTRICT)))
const listType = ref('red')
const hospitalName = ref('')
const insuranceType = ref(INSURANCE_TYPES[0])
const selectedTags = ref([])
const content = ref('')
const receiptPreview = ref('')
const receiptLocalPath = ref('')
const submitting = ref(false)
const canvasW = ref(800)
const canvasH = ref(800)

const currentTags = computed(() => (listType.value === 'red' ? RED_TAGS : BLACK_TAGS))

function switchListType(type) {
  listType.value = type
  selectedTags.value = []
}

function toggleTag(tag) {
  const idx = selectedTags.value.indexOf(tag)
  if (idx >= 0) {
    selectedTags.value.splice(idx, 1)
  } else if (selectedTags.value.length < 3) {
    selectedTags.value.push(tag)
  } else {
    uni.showToast({ title: '最多选择 3 个标签', icon: 'none' })
  }
}

async function chooseReceipt() {
  try {
    const chooseRes = await uni.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['original']
    })
    const file = chooseRes?.tempFiles?.[0]
    if (!file?.tempFilePath) return

    uni.showLoading({ title: '压缩中...', mask: true })

    const info = await new Promise((resolve, reject) => {
      uni.getImageInfo({ src: file.tempFilePath, success: resolve, fail: reject })
    })
    const maxW = 800
    if (info.width > maxW) {
      canvasW.value = maxW
      canvasH.value = Math.round(info.height * maxW / info.width)
    } else {
      canvasW.value = info.width
      canvasH.value = info.height
    }

    await new Promise((r) => setTimeout(r, 80))

    const compressed = await compressReceiptImage(file.tempFilePath, instance?.proxy)
    receiptLocalPath.value = compressed
    receiptPreview.value = compressed
    uni.hideLoading()
  } catch (err) {
    uni.hideLoading()
    const msg = err?.errMsg || ''
    if (!/cancel/i.test(msg)) {
      handleReviewError(err, '图片处理失败')
    }
  }
}

function onCityPick(e) {
  const idx = Number(e.detail.value)
  cityIndex.value = idx
  city.value = cityList[idx] || ''
  districtList.value = getDistrictsForCity(city.value)
  districtIndex.value = 0
  district.value = districtList.value[0] || ''
  locFailed.value = false
}

function onDistrictPick(e) {
  const idx = Number(e.detail.value)
  districtIndex.value = idx
  district.value = districtList.value[idx] || ''
}

function applyDefaultLocation() {
  city.value = DEFAULT_CITY
  district.value = DEFAULT_DISTRICT
  cityIndex.value = Math.max(0, cityList.indexOf(DEFAULT_CITY))
  districtList.value = getDistrictsForCity(DEFAULT_CITY)
  districtIndex.value = Math.max(0, districtList.value.indexOf(DEFAULT_DISTRICT))
}

async function tryLocate() {
  locating.value = true
  locFailed.value = false
  const geo = await resolveLocationCityDistrict()
  locating.value = false
  if (geo.city) {
    city.value = geo.city
    district.value = geo.district || ''
    cityIndex.value = Math.max(0, cityList.indexOf(geo.city))
    districtList.value = getDistrictsForCity(geo.city)
    if (geo.district) {
      districtIndex.value = Math.max(0, districtList.value.indexOf(geo.district))
    }
  } else {
    locFailed.value = true
    if (!city.value) applyDefaultLocation()
  }
}

function applyReviewDoc(doc) {
  hospitalName.value = doc.hospital_name || ''
  listType.value = doc.list_type || 'red'
  city.value = doc.city || DEFAULT_CITY
  district.value = doc.district || DEFAULT_DISTRICT
  insuranceType.value = doc.insurance_type || INSURANCE_TYPES[0]
  selectedTags.value = Array.isArray(doc.tags) ? [...doc.tags] : []
  content.value = doc.content || ''
  cityIndex.value = Math.max(0, cityList.indexOf(city.value))
  districtList.value = getDistrictsForCity(city.value)
  districtIndex.value = Math.max(0, districtList.value.indexOf(district.value))
  existingReceiptCloudId.value = doc.receiptImg || ''
  receiptPreview.value = doc.receiptImg || ''
  receiptLocalPath.value = ''
  locating.value = false
  locFailed.value = false
}

async function loadForEdit(id) {
  pageLoading.value = true
  uni.showLoading({ title: '加载中...', mask: true })
  try {
    const openid = await fetchCurrentOpenId()
    if (openid !== ADMIN_OPENID) {
      throw new Error('无权编辑此评价')
    }
    const doc = await fetchReviewById(id)
    if (!doc) {
      throw new Error('评价不存在或已删除')
    }
    editId.value = String(id)
    applyReviewDoc(doc)
  } catch (err) {
    handleReviewError(err, '加载评价失败')
    setTimeout(() => uni.navigateBack(), 800)
  } finally {
    pageLoading.value = false
    uni.hideLoading()
  }
}

async function submit() {
  if (submitting.value || pageLoading.value) return

  if (!hospitalName.value.trim()) {
    uni.showToast({ title: '请填写医院名称', icon: 'none' })
    return
  }
  if (!content.value.trim()) {
    uni.showToast({ title: '请填写评价内容', icon: 'none' })
    return
  }
  if (!city.value) {
    uni.showToast({ title: '请选择城市', icon: 'none' })
    return
  }

  submitting.value = true
  uni.showLoading({ title: isEditMode.value ? '保存中...' : '发布中...', mask: true })

  let receiptFileId = existingReceiptCloudId.value

  try {
    if (receiptLocalPath.value) {
      try {
        receiptFileId = await uploadReceiptImage(receiptLocalPath.value)
      } catch (uploadErr) {
        console.warn('[review] receipt upload failed, publish without image:', uploadErr)
        const raw = uploadErr?.message || uploadErr?.errMsg || '验单上传失败'
        const isNetwork = /ECONNRESET|timeout|network|fail/i.test(raw)
        const uploadHint = isNetwork
          ? '云存储连接失败（网络或云环境），不是图片违规。建议先不传图发布文字。'
          : raw
        const goOn = await new Promise((resolve) => {
          uni.showModal({
            title: '验单图上传失败',
            content: `${uploadHint.slice(0, 100)}\n\n可先${isEditMode.value ? '保留原图并' : ''}发布纯文字评价，是否继续？`,
            confirmText: isEditMode.value ? '继续保存' : '继续发布',
            cancelText: '取消',
            success: (r) => resolve(!!r.confirm)
          })
        })
        if (!goOn) {
          uni.hideLoading()
          return
        }
        if (isEditMode.value) {
          receiptFileId = existingReceiptCloudId.value
        } else {
          receiptFileId = ''
        }
      }
    }

    const payload = {
      hospitalName: hospitalName.value.trim(),
      listType: listType.value,
      city: city.value,
      district: district.value,
      insuranceType: insuranceType.value,
      tags: [...selectedTags.value],
      content: content.value.trim(),
      receiptFileId
    }

    if (isEditMode.value) {
      const { id, doc } = await adminUpdateReview(editId.value, {
        ...payload,
        oldReceiptFileId: existingReceiptCloudId.value
      }, { verifiedAdmin: true })
      uni.hideLoading()
      uni.showToast({ title: '已保存', icon: 'success' })
      uni.$emit('review-updated', { id, doc })
    } else {
      const { id, doc } = await publishReview(payload)
      uni.hideLoading()
      uni.showToast({ title: '发布成功！', icon: 'success' })
      uni.$emit('review-published', { id, doc })
    }

    setTimeout(() => {
      uni.navigateBack()
    }, 500)
  } catch (err) {
    uni.hideLoading()
    const msg = err?.message || err?.errMsg || (isEditMode.value ? '保存失败' : '发布失败')
    uni.showToast({ title: msg.slice(0, 40), icon: 'none', duration: 3500 })
  } finally {
    submitting.value = false
  }
}

onLoad((options) => {
  if (options?.id) {
    loadForEdit(options.id)
    return
  }
  applyDefaultLocation()
  tryLocate()
})
</script>

<style lang="scss" scoped>
.publish-page {
  padding-bottom: 48rpx;
}

.loc-bar {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 24rpx 28rpx;
}

.loc-info {
  flex: 1;
  min-width: 0;
}

.loc-icon {
  font-size: 32rpx;
  margin-top: 4rpx;
}

.loc-text {
  display: block;
  font-size: 28rpx;
  color: var(--text-2);
}

.loc-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--text-4);
}

.loc-retry {
  font-size: 24rpx;
  color: var(--primary);
  flex-shrink: 0;
  padding: 8rpx 0;
}

.loc-pickers {
  margin-top: 20rpx;
}

.list-type-row {
  display: flex;
  gap: 20rpx;
}

.list-type-btn {
  flex: 1;
  text-align: center;
  padding: 24rpx;
  border-radius: 24rpx;
  font-size: 28rpx;
  color: var(--text-3);
  background: var(--bg-input);
  border: 2rpx solid var(--border);
  transition: all 0.25s ease;

  &.active.red {
    color: var(--success);
    border-color: rgba(74, 222, 128, 0.5);
    background: var(--success-light);
  }

  &.active.black {
    color: var(--text-1);
    border-color: var(--border);
    background: rgba(60, 60, 70, 0.4);
  }
}

.badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.ins-badge,
.tag-badge {
  padding: 14rpx 24rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: var(--text-3);
  background: var(--bg-input);
  border: 1rpx solid var(--border);
  transition: all 0.3s ease;

  &.active {
    color: var(--primary);
    background: var(--primary-light);
    border-color: var(--primary);
  }
}

.tag-badge.breathing.active {
  animation: tag-breathe 2s ease-in-out infinite;
}

@keyframes tag-breathe {
  0%, 100% {
    box-shadow: 0 0 8rpx rgba(255, 154, 102, 0.2);
  }
  50% {
    box-shadow: 0 0 24rpx rgba(255, 154, 102, 0.55);
    transform: scale(1.03);
  }
}

.form-textarea {
  width: 100%;
  min-height: 200rpx;
  border: 1px solid var(--border);
  border-radius: $radius-input;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: var(--text-1);
  background: var(--bg-input);
  box-sizing: border-box;
}

.upload-area {
  width: 100%;
  height: 280rpx;
  border-radius: 24rpx;
  border: 2rpx dashed var(--border);
  background: var(--bg-input);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-preview {
  width: 100%;
  height: 100%;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.upload-icon {
  font-size: 56rpx;
}

.upload-hint {
  font-size: 28rpx;
  color: var(--text-2);
}

.upload-sub {
  font-size: 22rpx;
  color: var(--text-4);
}

.hidden-canvas {
  position: fixed;
  left: -9999px;
  top: -9999px;
  opacity: 0;
  pointer-events: none;
}

.btn-primary.disabled {
  opacity: 0.6;
  pointer-events: none;
}
</style>
