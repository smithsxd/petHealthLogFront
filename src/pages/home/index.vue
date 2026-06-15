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
      </view>
      <view v-if="countdownList.length" class="countdown-list">
        <view
          v-for="cd in countdownList"
          :key="cd._id"
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
            <text class="cd-date">上次：{{ cd.lastDate }}</text>
            <view class="cd-progress">
              <view class="cd-progress-fill" :style="{ width: cd.progress + '%' }" />
            </view>
            <text class="cd-action" @click.stop="openRenew(cd)">一键续期</text>
          </view>
        </view>
      </view>
      <EmptyState v-else icon="💉" title="暂无提醒计划" desc="可在云数据库 pet_reminders 中维护驱虫疫苗记录" />
    </view>

    <view class="section" v-if="petStore.currentPetId">
      <view class="section-header">
        <text class="section-title">今日用药</text>
      </view>
      <view v-if="ongoingMedication" class="med-card card">
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
      <EmptyState v-else icon="💊" title="暂无进行中的用药" desc="可在医嘱页新增用药计划" />
    </view>

    <template #overlay>
      <view class="popup-mask" v-if="renewVisible" @click="renewVisible = false">
        <view class="popup-sheet" @click.stop>
          <text class="popup-title">确认续期</text>
          <text class="popup-desc">确定「{{ currentPet?.name }}」今天已完成「{{ renewLabel }}」吗？</text>
          <view class="btn-primary" @click="confirmRenew">确认完成</view>
          <view class="popup-cancel" @click="renewVisible = false">取消</view>
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
  loadReminders,
  loadMedications,
  renewReminder
} from '@/store/pet.js'
import { freqToTag } from '@/cloud/helpers.js'

const renewVisible = ref(false)
const renewLabel = ref('')
const renewTargetId = ref('')
const medChecklist = reactive([])

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

function openRenew(cd) {
  renewLabel.value = cd.label
  renewTargetId.value = cd._id
  renewVisible.value = true
}

async function confirmRenew() {
  if (!renewTargetId.value) return
  try {
    await renewReminder(renewTargetId.value)
    uni.showToast({ title: '已续期', icon: 'success' })
    renewVisible.value = false
  } catch (err) {
    console.error(err)
    uni.showToast({ title: '续期失败', icon: 'none' })
  }
}

function goAddPet() {
  uni.reLaunch({ url: '/pages/archive/index' })
}

onShow(async () => {
  await loadPets()
  await Promise.all([loadReminders(), loadMedications()])
  syncMedChecklist()
})
</script>

<style lang="scss" scoped>
.countdown-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
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

.cd-action {
  display: inline-flex;
  align-self: flex-end;
  margin-top: 16rpx;
  font-size: 22rpx;
  color: $primary;
  border: 1px solid $primary;
  border-radius: $radius-pill;
  padding: 8rpx 28rpx;

  &:active {
    background: $primary;
    color: #fff;
  }
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
  margin-bottom: 32rpx;
}

.popup-cancel {
  margin-top: 20rpx;
  text-align: center;
  font-size: 30rpx;
  color: $text-2;
  padding: 24rpx;
}
</style>
