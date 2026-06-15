<template>
  <TabPageLayout title="医嘱录入" show-back back-to-index tab-current="medical">
    <PetBar v-if="petBarPets.length" :pets="petBarPets" v-model="currentPetIndex" />
    <EmptyState v-else icon="🐾" title="还没有宠物" desc="请先在档案页添加宠物" />

    <view class="section" v-if="petStore.currentPetId">
      <view class="card">
        <view class="card-title">
          <view class="icon-badge info">📋</view>
          <text>基本信息</text>
        </view>
        <view class="form-item">
          <text class="form-label">病例标题</text>
          <input class="form-input" v-model="caseTitle" placeholder="例：急性拉稀" />
        </view>
        <view class="form-row">
          <view class="form-item">
            <text class="form-label">用药开始日期</text>
            <view class="picker-cell" @click="openPicker('start')">
              <text class="picker-cell-text">{{ startDisplay }}</text>
              <text class="picker-cell-arrow">▾</text>
            </view>
          </view>
          <view class="form-item">
            <text class="form-label">预计结束日期</text>
            <view class="picker-cell" @click="openPicker('end')">
              <text class="picker-cell-text">{{ endDisplay }}</text>
              <text class="picker-cell-arrow">▾</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="section" v-if="petStore.currentPetId">
      <view class="section-header">
        <view class="card-title" style="margin-bottom: 0">
          <view class="icon-badge primary">💊</view>
          <text>药方计划</text>
        </view>
      </view>
      <view v-for="(plan, i) in plans" :key="i" class="plan-card card">
        <text class="plan-badge">药品 {{ i + 1 }}</text>
        <text v-if="plans.length > 1" class="plan-delete" @click="removeMed(i)">删除</text>
        <view class="form-item">
          <text class="form-label">药品名称</text>
          <input class="form-input" v-model="plan.name" placeholder="例：速诺" />
        </view>
        <view class="form-row">
          <view class="form-item">
            <text class="form-label">用药频次</text>
            <picker :range="freqOptions" :value="freqOptions.indexOf(plan.freq)" @change="(e) => plan.freq = freqOptions[e.detail.value]">
              <view class="form-input picker-like">{{ plan.freq }}</view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">单次剂量</text>
            <input class="form-input" v-model="plan.dose" placeholder="例：1.5 片" />
          </view>
        </view>
        <view class="form-item">
          <text class="form-label">备注说明</text>
          <input class="form-input" v-model="plan.note" placeholder="例：饭后服用" />
        </view>
      </view>
      <view class="add-btn" @click="addMed">+ 添加下一条药品</view>
    </view>

    <view class="section" v-if="petStore.currentPetId">
      <view class="btn-primary" @click="submitForm">保存医嘱</view>
    </view>

    <view class="section" v-if="savedCases.length">
      <text class="section-sub saved-heading">已保存的医嘱</text>
      <view class="case-card card" v-for="c in savedCases" :key="c._id">
        <text class="case-date">{{ c.start_date }} ～ {{ c.end_date }}</text>
        <text class="case-title">{{ c.title }}</text>
        <view class="case-divider" />
        <view v-for="(m, j) in c.plan_list" :key="j" class="case-med">
          <text class="case-med-text">{{ m.name }} · {{ m.freq }} · {{ m.dose }}</text>
        </view>
      </view>
    </view>

    <template #extra>
      <u-datetime-picker
        :show="showPicker"
        v-model="pickerVal"
        mode="date"
        @confirm="onPickerConfirm"
        @cancel="showPicker = false"
        @close="showPicker = false"
      />
    </template>
  </TabPageLayout>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import TabPageLayout from '@/components/TabPageLayout/index.vue'
import PetBar from '@/components/PetBar/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
import {
  petStore,
  petBarPets,
  currentPetIndex,
  loadPets,
  addMedication,
  loadAllMedicationsForPet
} from '@/store/pet.js'
import { formatDisplayDate, todayISO } from '@/cloud/helpers.js'

const caseTitle = ref('')
const startDate = ref(todayISO())
const endDate = ref(todayISO())
const startDisplay = ref(formatDisplayDate(todayISO()))
const endDisplay = ref(formatDisplayDate(todayISO()))
const showPicker = ref(false)
const pickerVal = ref(Date.now())
const pickerTarget = ref('start')
const freqOptions = ['一天1次', '一天2次', '一天3次', '每两天1次', '每周1次']
const savedCases = ref([])
const plans = reactive([{ name: '', freq: '一天1次', dose: '', note: '' }])
const submitting = ref(false)

function addMed() {
  plans.push({ name: '', freq: '一天1次', dose: '', note: '' })
}

function removeMed(i) {
  if (plans.length <= 1) {
    uni.showToast({ title: '至少保留一条', icon: 'none' })
    return
  }
  plans.splice(i, 1)
}

function openPicker(target) {
  pickerTarget.value = target
  showPicker.value = true
}

function onPickerConfirm(e) {
  const d = new Date(e.value)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const display = `${y}年${m}月${day}日`
  const val = `${y}-${m}-${day}`
  if (pickerTarget.value === 'start') {
    startDisplay.value = display
    startDate.value = val
  } else {
    endDisplay.value = display
    endDate.value = val
  }
  showPicker.value = false
}

async function loadCases() {
  savedCases.value = await loadAllMedicationsForPet()
}

async function submitForm() {
  if (!petStore.currentPetId) {
    uni.showToast({ title: '请先添加宠物', icon: 'none' })
    return
  }
  if (submitting.value) return
  submitting.value = true
  try {
    await addMedication({
      title: caseTitle.value || '未命名病例',
      start_date: startDate.value,
      end_date: endDate.value,
      plan_list: plans.map((p) => ({
        name: p.name || '未填',
        freq: p.freq,
        dose: p.dose || '未填',
        note: p.note || ''
      }))
    })
    caseTitle.value = ''
    plans.splice(0, plans.length, { name: '', freq: '一天1次', dose: '', note: '' })
    await loadCases()
    uni.showToast({ title: '医嘱已保存', icon: 'success' })
  } catch (err) {
    console.error(err)
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onShow(async () => {
  await loadPets()
  await loadCases()
})
</script>

<style lang="scss" scoped>
.picker-like {
  display: flex;
  align-items: center;
}

.plan-card {
  position: relative;
  margin-bottom: 20rpx;
}

.plan-badge {
  font-size: 22rpx;
  color: $primary;
  background: $primary-light;
  padding: 4rpx 20rpx;
  border-radius: $radius-pill;
  font-weight: 600;
  display: inline-block;
  margin-bottom: 20rpx;
}

.plan-delete {
  position: absolute;
  top: 28rpx;
  right: 28rpx;
  font-size: 26rpx;
  color: $danger;
}

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx;
  border: 2rpx dashed $primary;
  border-radius: $radius-btn;
  color: $primary;
  font-size: 28rpx;
  font-weight: 600;

  &:active {
    background: $primary;
    color: #fff;
    border-style: solid;
  }
}

.saved-heading {
  display: block;
  margin-bottom: 20rpx;
}

.case-card {
  margin-bottom: 20rpx;
}

.case-date {
  font-size: 22rpx;
  color: $text-4;
  display: block;
}

.case-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-1;
  display: block;
  margin-top: 4rpx;
}

.case-divider {
  height: 1px;
  background: $divider;
  margin: 16rpx 0;
}

.case-med {
  padding: 8rpx 0;
}

.case-med-text {
  font-size: 26rpx;
  color: $text-2;
}
</style>
