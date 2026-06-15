<template>
  <TabPageLayout
    title="核心健康看板"
    show-back
    back-to-index
    action-text="+ 添加"
    tab-current="home"
    @nav-action="goAddPet"
  >
    <PetBar v-if="petBarPets.length" :pets="petBarPets" v-model="currentPetIndex" show-add @add="goAddPet" />
    <EmptyState v-else icon="🐾" title="还没有宠物" desc="点击右上角或下方添加第一只毛孩子" />

    <view class="section" v-if="petStore.currentPetId">
      <view class="section-header">
        <text class="section-title">驱虫 & 疫苗</text>
        <view class="section-header-right">
          <text class="add-reminder-btn" @click="openAddReminder">+ 添加提醒</text>
        </view>
      </view>
      <view v-if="countdownList.length" class="countdown-list">
        <u-swipe-action>
          <u-swipe-action-item
            v-for="(cd, i) in countdownList"
            :key="cd._id"
            :index="i"
            :options="swipeOptions"
            @click="deleteReminder(cd._id)"
          >
        <view
          class="cd-card"
          :class="'state-' + cd.state"
        >
          <view class="cd-left">
            <view class="cd-num-box">
              <text class="cd-num">{{ cd.absDays }}</text>
              <text class="cd-num-unit">{{ cd.isOverdue ? '已超期' : '剩余天' }}</text>
            </view>
          </view>
          <view class="cd-right">
            <view class="cd-header">
              <text class="cd-label">{{ cd.label }}</text>
              <text class="cd-badge">{{ cd.stateLabel }}</text>
            </view>
            <text class="cd-drug">{{ cd.drug }}</text>
            <text class="cd-date">预计：{{ cd.expectedDate }}</text>
            <view class="cd-progress">
              <view class="cd-progress-fill" :style="{ width: cd.progress + '%' }" />
            </view>
            <view class="cd-actions" v-if="cd.state !== 'done'">
              <text class="cd-action cd-action-extend" @click.stop="openExtend(cd)">一键续期</text>
              <text class="cd-action" @click.stop="openComplete(cd)">完成</text>
            </view>
          </view>
        </view>
          </u-swipe-action-item>
        </u-swipe-action>
      </view>
      <EmptyState v-else icon="💉" title="暂无提醒计划" desc="点击右上角「添加提醒」录入驱虫疫苗计划" />
    </view>

    <view class="section" v-if="petStore.currentPetId">
      <view class="section-header">
        <text class="section-title">今日用药</text>
      </view>
      <view v-if="ongoingMedication">
        <u-swipe-action>
          <u-swipe-action-item
            :index="0"
            :options="swipeOptions"
            @click="deleteMedication"
          >
            <view class="med-card card">
        <view class="card-title" style="margin-bottom: 0">
          <view class="icon-badge primary">💊</view>
          <text>{{ ongoingMedication.title }}</text>
        </view>
        <view class="med-divider" />
        <view class="med-item" v-for="(med, i) in medChecklist" :key="i">
          <view class="med-check" :class="{ done: med.done }" @click="med.done = !med.done">
            <text v-if="med.done">✓</text>
          </view>
          <text class="med-text" :class="{ done: med.done }">
            {{ med.text }}<text class="med-tag" :class="med.tagClass">{{ med.tag }}</text>
          </text>
        </view>
        <text class="med-tip">勾选标记当日完成，防止家人重复喂药</text>
      </view>
          </u-swipe-action-item>
        </u-swipe-action>
      </view>
      <EmptyState v-else icon="💊" title="暂无进行中的用药" desc="可在医嘱页新增用药计划" />
    </view>

    <template #overlay>
      <!-- 完成确认弹窗 -->
      <view class="popup-mask" v-if="completeVisible" @click="completeVisible = false">
        <view class="popup-sheet" @click.stop>
          <text class="popup-title">确认完成</text>
          <text class="popup-desc">确定「{{ currentPet?.name }}」今天已完成「{{ completeLabel }}」吗？</text>
          <text class="popup-hint">完成后标记为已完成，不再倒计时</text>
          <view class="btn-primary" @click="confirmComplete">确认完成</view>
          <view class="popup-cancel" @click="completeVisible = false">取消</view>
        </view>
      </view>

      <!-- 一键续期弹窗 -->
      <view class="popup-mask" v-if="extendVisible" @click="extendVisible = false">
        <view class="popup-sheet" @click.stop>
          <text class="popup-title">一键续期</text>
          <text class="popup-desc">将「{{ extendLabel }}」的预计日期向后延期</text>
          <view class="extend-options">
            <view
              v-for="opt in extendOptions"
              :key="opt.days"
              class="extend-opt"
              :class="{ selected: extendDays === opt.days }"
              @click="extendDays = opt.days"
            >
              <text class="extend-opt-num">+{{ opt.days }}</text>
              <text class="extend-opt-label">{{ opt.label }}</text>
            </view>
            <view class="extend-opt extend-opt--custom" :class="{ selected: isCustomDays }">
              <view class="extend-custom-row">
                <text class="extend-custom-prefix">+</text>
                <input
                  class="extend-custom-input"
                  v-model="customDaysInput"
                  type="number"
                  placeholder="自定义"
                  @focus="onCustomDaysFocus"
                  @input="onCustomDaysInput"
                />
                <text class="extend-custom-suffix">天</text>
              </view>
            </view>
          </view>
          <view class="btn-primary" @click="confirmExtend">确认延期</view>
          <view class="popup-cancel" @click="extendVisible = false">取消</view>
        </view>
      </view>

      <!-- 添加提醒弹窗 -->
      <view class="popup-mask" v-if="addReminderVisible" @click="addReminderVisible = false">
        <view class="popup-sheet reminder-sheet" @click.stop>
          <text class="popup-title">添加提醒</text>

          <view class="form-item">
            <text class="form-label">提醒类型</text>
            <view class="radio-group">
              <view
                v-for="opt in reminderTypeOptions"
                :key="opt.value"
                class="radio-item"
                :class="{ selected: reminderForm.type === opt.value }"
                @click="onReminderTypeChange(opt.value)"
              >{{ opt.label }}</view>
            </view>
          </view>

          <view class="form-item">
            <text class="form-label">药品 / 项目名称</text>
            <input class="form-input" v-model="reminderForm.itemName" placeholder="例：福来恩、卫佳捌" />
          </view>

          <view class="form-item">
            <text class="form-label">预计日期</text>
            <picker mode="date" :value="reminderForm.expectedDate" @change="onReminderDateChange">
              <view class="picker-cell">
                <text class="picker-cell-text">{{ reminderDateDisplay || '请选择预计日期' }}</text>
                <text class="picker-cell-arrow">▾</text>
              </view>
            </picker>
          </view>

          <view class="btn-primary" @click="confirmAddReminder">确认添加</view>
          <view class="popup-cancel" @click="addReminderVisible = false">取消</view>
        </view>
      </view>
    </template>
  </TabPageLayout>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import TabPageLayout from '@/components/TabPageLayout/index.vue'
import PetBar from '@/components/PetBar/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
import {
  petStore,
  petBarPets,
  currentPetIndex,
  currentPet,
  countdownList,
  ongoingMedication,
  loadPets,
  completeReminder,
  extendReminder,
  addReminder,
  removeReminder,
  removeMedication
} from '@/store/pet.js'
import { freqToTag, formatDisplayDate, todayISO, addDaysISO, reminderCycleDays } from '@/cloud/helpers.js'

const medChecklist = reactive([])

const swipeOptions = [{
  text: '删除',
  style: { backgroundColor: '#fa3534', color: '#fff', fontSize: '14px' }
}]

// ---- 完成 ----
const completeVisible = ref(false)
const completeLabel = ref('')
const completeTargetId = ref('')

// ---- 一键续期 ----
const extendVisible = ref(false)
const extendLabel = ref('')
const extendTargetId = ref('')
const extendDays = ref(30)
const customDaysInput = ref('')
const isCustomDays = ref(false)
const extendOptions = [
  { days: 7, label: '一周' },
  { days: 30, label: '一个月' },
  { days: 90, label: '三个月' },
  { days: 180, label: '半年' },
  { days: 365, label: '一年' }
]

// ---- 添加提醒 ----
const addReminderVisible = ref(false)
const reminderTypeOptions = [
  { label: '🐛 体外驱虫', value: 'external_parasite' },
  { label: '🪱 体内驱虫', value: 'internal_parasite' },
  { label: '💉 疫苗', value: 'vaccine' }
]
const reminderForm = reactive({
  type: 'external_parasite',
  itemName: '',
  expectedDate: ''
})
const reminderDateDisplay = ref('')

function getDefaultExpectedDate(type) {
  return addDaysISO(todayISO(), reminderCycleDays(type))
}

function onReminderTypeChange(type) {
  reminderForm.type = type
  reminderForm.expectedDate = getDefaultExpectedDate(type)
  reminderDateDisplay.value = formatDisplayDate(reminderForm.expectedDate)
}

function syncMedChecklist() {
  medChecklist.splice(0, medChecklist.length)
  const med = ongoingMedication.value
  if (!med?.plan_list?.length) return
  med.plan_list.forEach((item) => {
    const { tag, tagClass } = freqToTag(item.freq)
    medChecklist.push({
      text: `${item.name}${item.dose ? ` ${item.dose}` : ''}`,
      tag,
      tagClass,
      done: false
    })
  })
}

watch(ongoingMedication, syncMedChecklist, { immediate: true })

// ---- 完成 ----
function openComplete(cd) {
  completeLabel.value = cd.label
  completeTargetId.value = cd._id
  completeVisible.value = true
}

async function confirmComplete() {
  if (!completeTargetId.value) return
  try {
    await completeReminder(completeTargetId.value)
    uni.showToast({ title: '已完成', icon: 'success' })
    completeVisible.value = false
  } catch (err) {
    console.error(err)
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

// ---- 一键续期 ----
function openExtend(cd) {
  extendLabel.value = cd.label + ' · ' + cd.drug
  extendTargetId.value = cd._id
  extendDays.value = 30
  customDaysInput.value = ''
  isCustomDays.value = false
  extendVisible.value = true
}

function onCustomDaysFocus() {
  isCustomDays.value = true
}

function onCustomDaysInput() {
  const val = parseInt(customDaysInput.value, 10)
  if (!isNaN(val) && val > 0) {
    isCustomDays.value = true
    extendDays.value = val
  }
}

async function confirmExtend() {
  if (!extendTargetId.value) return
  const days = extendDays.value
  if (!days || days <= 0) {
    uni.showToast({ title: '请输入有效天数', icon: 'none' })
    return
  }
  try {
    await extendReminder(extendTargetId.value, days)
    uni.showToast({ title: `已延期 +${extendDays.value} 天`, icon: 'success' })
    extendVisible.value = false
  } catch (err) {
    console.error(err)
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

// ---- 添加提醒 ----
function openAddReminder() {
  if (!petStore.currentPetId) {
    uni.showToast({ title: '请先添加宠物', icon: 'none' })
    return
  }
  reminderForm.type = 'external_parasite'
  reminderForm.itemName = ''
  reminderForm.expectedDate = getDefaultExpectedDate('external_parasite')
  reminderDateDisplay.value = formatDisplayDate(reminderForm.expectedDate)
  addReminderVisible.value = true
}

function onReminderDateChange(e) {
  const val = e.detail.value
  reminderForm.expectedDate = val
  reminderDateDisplay.value = formatDisplayDate(val)
}

async function confirmAddReminder() {
  if (!reminderForm.itemName.trim()) {
    uni.showToast({ title: '请填写药品名称', icon: 'none' })
    return
  }
  if (!reminderForm.expectedDate) {
    uni.showToast({ title: '请选择预计日期', icon: 'none' })
    return
  }
  try {
    await addReminder({
      type: reminderForm.type,
      itemName: reminderForm.itemName.trim(),
      expectedDate: reminderForm.expectedDate
    })
    uni.showToast({ title: '提醒已添加', icon: 'success' })
    addReminderVisible.value = false
  } catch (err) {
    console.error(err)
    uni.showToast({ title: '添加失败', icon: 'none' })
  }
}

function goAddPet() {
  uni.reLaunch({ url: '/pages/archive/index' })
}

async function deleteReminder(id) {
  try {
    await removeReminder(id)
    uni.showToast({ title: '已删除', icon: 'success' })
  } catch (err) {
    console.error(err)
    uni.showToast({ title: '删除失败', icon: 'none' })
  }
}

async function deleteMedication() {
  const id = ongoingMedication.value?._id
  if (!id) return
  try {
    await removeMedication(id)
    uni.showToast({ title: '已删除', icon: 'success' })
  } catch (err) {
    console.error(err)
    uni.showToast({ title: '删除失败', icon: 'none' })
  }
}

onShow(async () => {
  await loadPets()
  syncMedChecklist()
})
</script>

<style lang="scss" scoped>
.countdown-list {
  display: flex;
  flex-direction: column;
}

.countdown-list :deep(.u-swipe-action) {
  display: flex;
  flex-direction: column;
}

.countdown-list :deep(.u-swipe-action-item) {
  margin-bottom: 20rpx;
  border-radius: $radius-card;
  overflow: hidden;
}

.countdown-list :deep(.u-swipe-action-item__content) {
  border-radius: $radius-card;
}

.cd-card {
  display: flex;
  gap: 28rpx;
  background: $bg-card;
  border-radius: $radius-card;
  padding: 28rpx;
  box-shadow: $shadow-card;
  border-left: 6rpx solid $border;

  &.state-safe { border-left-color: $success; }
  &.state-warn { border-left-color: $warning; background: $warning-light; }
  &.state-danger { border-left-color: $danger; background: $danger-light; }
  &.state-done { border-left-color: $text-4; opacity: 0.65; }
}

.cd-left {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.cd-num-box {
  width: 120rpx;
  height: 120rpx;
  border-radius: 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
}

.state-safe .cd-num-box { background: $success; }
.state-warn .cd-num-box { background: $warning; }
.state-danger .cd-num-box { background: $danger; }
.state-done .cd-num-box { background: $text-4; }

.cd-num { font-size: 48rpx; line-height: 1.1; }
.cd-num-unit { font-size: 20rpx; opacity: 0.92; }

.cd-right {
  flex: 1;
  min-width: 0;
}

.cd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4rpx;
}

.cd-label {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-1;
}

.cd-badge {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: $radius-pill;
  font-weight: 500;
}

.state-safe .cd-badge { background: $success-light; color: $success; }
.state-warn .cd-badge { background: rgba(245, 158, 11, 0.15); color: $warning; }
.state-danger .cd-badge { background: rgba(250, 53, 52, 0.12); color: $danger; }
.state-done .cd-badge { background: $bg-page; color: $text-3; }

.cd-drug { font-size: 26rpx; color: $text-2; }
.cd-date { font-size: 20rpx; color: $text-4; margin-top: 4rpx; display: block; }

.cd-progress {
  height: 8rpx;
  background: $bg-page;
  border-radius: 4rpx;
  margin-top: 16rpx;
  overflow: hidden;
}

.cd-progress-fill {
  height: 100%;
  border-radius: 4rpx;
  transition: width 0.5s ease;
}

.state-safe .cd-progress-fill { background: $success; }
.state-warn .cd-progress-fill { background: $warning; }
.state-danger .cd-progress-fill { background: $danger; }
.state-done .cd-progress-fill { background: $text-4; }

.cd-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}

.cd-action {
  font-size: 22rpx;
  color: $primary;
  border: 1px solid $primary;
  border-radius: $radius-pill;
  padding: 8rpx 28rpx;

  &:active {
    background: $primary;
    color: #fff;
  }

  &-extend {
    color: $text-2;
    border-color: $text-4;

    &:active {
      background: $text-2;
      color: #fff;
    }
  }
}

.med-card {
  border-radius: $radius-card;
  overflow: hidden;
}

.med-divider {
  height: 1px;
  background: $divider;
  margin: 20rpx 0;
}

.med-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 16rpx 0;
}

.med-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid $border;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 24rpx;
  color: #fff;

  &.done {
    border-color: $success;
    background: $success;
  }
}

.med-text {
  font-size: 28rpx;
  color: $text-2;

  &.done {
    color: $text-4;
    text-decoration: line-through;
  }
}

.med-tag {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  margin-left: 12rpx;

  &.morning { background: $primary-light; color: $primary; }
  &.noon { background: $warning-light; color: $warning; }
  &.evening { background: #f0f0ff; color: #6c5ce7; }
}

.med-tip {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1px solid $divider;
  font-size: 22rpx;
  color: $text-3;
  text-align: center;
  display: block;
}

.popup-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1001;
  display: flex;
  align-items: flex-end;
}

.popup-sheet {
  width: 100%;
  background: $bg-card;
  border-radius: 32rpx 32rpx 0 0;
  padding: 40rpx 32rpx calc(48rpx + env(safe-area-inset-bottom));
}

.popup-title {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  text-align: center;
  margin-bottom: 12rpx;
}

.popup-desc {
  display: block;
  font-size: 28rpx;
  color: $text-3;
  text-align: center;
  margin-bottom: 24rpx;
}

.popup-hint {
  display: block;
  font-size: 22rpx;
  color: $primary;
  text-align: center;
  margin-bottom: 24rpx;
  background: $primary-light;
  padding: 8rpx 20rpx;
  border-radius: $radius-pill;
  align-self: center;
}

.popup-cancel {
  margin-top: 20rpx;
  text-align: center;
  font-size: 30rpx;
  color: $text-2;
  padding: 24rpx;
}

.add-reminder-btn {
  font-size: 24rpx;
  color: $primary;
  padding: 8rpx 20rpx;
  border: 1px solid $primary;
  border-radius: $radius-pill;

  &:active {
    background: $primary;
    color: #fff;
  }
}

.section-header-right {
  display: flex;
  align-items: center;
}

.reminder-sheet {
  max-height: 80vh;
  overflow-y: auto;
}

.extend-options {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.extend-opt {
  flex: 1;
  min-width: 120rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 12rpx;
  border: 2rpx solid $border;
  border-radius: $radius-input;
  background: $bg-card;
  transition: all 0.2s;

  &.selected {
    border-color: $primary;
    background: $primary-light;
  }
}

.extend-opt-num {
  font-size: 36rpx;
  font-weight: 700;
  color: $text-1;
}

.extend-opt-label {
  font-size: 22rpx;
  color: $text-3;
  margin-top: 4rpx;
}

.extend-opt.selected .extend-opt-num { color: $primary; }
.extend-opt.selected .extend-opt-label { color: $primary; }

.extend-opt--custom {
  min-width: 160rpx;
}

.extend-custom-row {
  display: flex;
  align-items: center;
  justify-content: center;
}

.extend-custom-prefix {
  font-size: 36rpx;
  font-weight: 700;
  color: $text-3;
}

.extend-custom-input {
  width: 100rpx;
  text-align: center;
  font-size: 32rpx;
  font-weight: 700;
  color: $text-1;
  background: transparent;
  border: none;
  min-height: auto;
  line-height: 1;
}

.extend-opt--custom.selected .extend-custom-prefix { color: $primary; }
.extend-opt--custom.selected .extend-custom-input { color: $primary; }

.extend-custom-suffix {
  font-size: 22rpx;
  color: $text-3;
  margin-left: 2rpx;
}

.extend-opt--custom.selected .extend-custom-suffix { color: $primary; }

.radio-group {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}

.radio-item {
  flex: 1;
  min-width: 140rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid $border;
  border-radius: $radius-input;
  font-size: 26rpx;
  background: $bg-card;
  transition: all 0.2s;

  &.selected {
    border-color: $primary;
    background: $primary-light;
    color: $primary;
    font-weight: 600;
  }
}

.form-label {
  font-size: 26rpx;
  color: $text-2;
  margin-bottom: 8rpx;
  font-weight: 500;
  display: block;
}
</style>
