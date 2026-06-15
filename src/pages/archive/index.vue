<template>
  <TabPageLayout title="宠物档案" show-back back-to-index tab-current="archive">
    <view class="section">
      <view class="card">
        <view class="card-title">
          <view class="icon-badge purple">📷</view>
          <text>头像</text>
        </view>
        <view class="avatar-section">
          <view class="avatar-outer">
            <view class="avatar-inner" @click="chooseAvatar">
              <image v-if="avatarUrl" class="avatar-img" :src="avatarUrl" mode="aspectFill" />
              <text v-else class="avatar-placeholder">🐾</text>
            </view>
          </view>
          <text class="avatar-hint">点击上传照片</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="card">
        <view class="card-title">
          <view class="icon-badge info">📝</view>
          <text>基础信息</text>
        </view>

        <view class="form-item">
          <text class="form-label">宠物名字</text>
          <input class="form-input" v-model="petName" placeholder="给毛孩子取个名字吧" maxlength="10" />
          <text class="form-counter">{{ petName.length }} / 10</text>
        </view>

        <view class="form-item">
          <text class="form-label">品种</text>
          <input class="form-input" v-model="petBreed" placeholder="例：英短蓝猫" />
        </view>

        <view class="form-item">
          <text class="form-label">类型</text>
          <view class="radio-group">
            <view class="radio-item" :class="{ selected: petType === 'cat' }" @click="petType = 'cat'">🐱 猫咪</view>
            <view class="radio-item" :class="{ selected: petType === 'dog' }" @click="petType = 'dog'">🐶 狗狗</view>
            <view class="radio-item" :class="{ selected: petType === 'other' }" @click="petType = 'other'">🐹 其他</view>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">性别</text>
          <view class="gender-row">
            <view class="gender-opt" :class="{ selected: petGender === 'female' }" @click="petGender = 'female'">妹妹</view>
            <view class="gender-opt" :class="{ selected: petGender === 'male' }" @click="petGender = 'male'">弟弟</view>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">生日</text>
          <view class="picker-cell" @click="showDatePicker = true">
            <text class="picker-cell-text">{{ birthdayDisplay || '请选择生日' }}</text>
            <text class="picker-cell-arrow">▾</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="btn-primary" @click="submitProfile">保存档案</view>
      <view v-if="uploading" class="upload-progress">
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: progress + '%' }" />
        </view>
        <text class="progress-text">{{ progressText }}</text>
      </view>
    </view>

    <view class="section" v-if="savedPets.length">
      <text class="section-sub saved-heading">我的宠物 · 左滑删除</text>
      <u-swipe-action>
        <u-swipe-action-item
          v-for="(p, i) in savedPets"
          :key="p._id"
          :index="i"
          :options="swipeOptions"
          @click="deletePet(p)"
        >
          <view class="pet-list-card card">
            <view class="pet-list-avatar">
              <image v-if="p.avatar" class="pet-list-avatar-img" :src="p.avatar" mode="aspectFill" />
              <text v-else>{{ p.emoji }}</text>
            </view>
            <view class="pet-list-info">
              <text class="pet-list-name">{{ p.name }}</text>
              <text class="pet-list-meta">{{ p.typeLabel }} · {{ p.genderLabel }} · {{ p.birthdayDisplay }}</text>
            </view>
          </view>
        </u-swipe-action-item>
      </u-swipe-action>
    </view>

    <template #extra>
      <u-datetime-picker
        :show="showDatePicker"
        v-model="datePickerVal"
        mode="date"
        @confirm="onDateConfirm"
        @cancel="showDatePicker = false"
        @close="showDatePicker = false"
      />
    </template>
  </TabPageLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import TabPageLayout from '@/components/TabPageLayout/index.vue'
import { petStore, loadPets, addPet, removePet, mapPetForList } from '@/store/pet.js'
import { formatDisplayDate } from '@/cloud/helpers.js'
import { uploadPetAvatar } from '@/cloud/upload.js'

const petName = ref('')
const petBreed = ref('')
const petType = ref('cat')
const petGender = ref('female')
const birthday = ref('')
const birthdayDisplay = ref('')
const avatarUrl = ref('')
const avatarFileId = ref('')
const showDatePicker = ref(false)
const datePickerVal = ref(Date.now())
const uploading = ref(false)
const progress = ref(0)
const progressText = ref('')
const submitting = ref(false)

const swipeOptions = [{
  text: '删除',
  style: { backgroundColor: '#fa3534', color: '#fff', fontSize: '13px' }
}]

const savedPets = computed(() =>
  petStore.pets.map((p) => ({
    ...mapPetForList(p),
    avatar: p.avatar,
    birthdayDisplay: formatDisplayDate(p.birthday) || '未设置'
  }))
)

async function chooseAvatar() {
  if (uploading.value) return
  uploading.value = true
  progress.value = 0
  progressText.value = '准备选图...'
  const fileId = await uploadPetAvatar({
    onPreview(path) {
      avatarUrl.value = path
    },
    onProgress(percent, text) {
      progress.value = percent
      progressText.value = text
    }
  })
  uploading.value = false
  if (fileId) {
    avatarFileId.value = fileId
    avatarUrl.value = fileId
  }
}

function onDateConfirm(e) {
  const d = new Date(e.value)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  birthdayDisplay.value = `${y}年${m}月${day}日`
  birthday.value = `${y}-${m}-${day}`
  showDatePicker.value = false
}

async function deletePet(pet) {
  if (!pet?._id) return
  uni.showModal({
    title: '确认删除',
    content: `确定删除「${pet.name}」的档案吗？相关体重、提醒和医嘱记录也会一并删除。`,
    confirmColor: '#fa3534',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await removePet(pet._id)
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (err) {
        console.error(err)
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    }
  })
}

async function submitProfile() {
  if (!petName.value.trim()) {
    uni.showToast({ title: '请填写宠物名字', icon: 'none' })
    return
  }
  if (submitting.value) return
  submitting.value = true
  try {
    const type = petType.value === 'other' ? 'cat' : petType.value
    await addPet({
      name: petName.value.trim(),
      type,
      breed: petBreed.value.trim(),
      gender: petGender.value,
      birthday: birthday.value,
      avatar: avatarFileId.value
    })
    petName.value = ''
    petBreed.value = ''
    avatarUrl.value = ''
    avatarFileId.value = ''
    uni.showToast({ title: '档案已保存', icon: 'success' })
  } catch (err) {
    console.error(err)
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onShow(() => {
  loadPets()
})
</script>

<style lang="scss" scoped>
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 0 8rpx;
}

.avatar-outer {
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  padding: 8rpx;
  background: linear-gradient(135deg, #ff9a56, $primary);
  box-shadow: 0 8rpx 32rpx rgba(255, 125, 63, 0.18);
}

.avatar-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: $bg-page;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  &:active {
    transform: scale(0.96);
  }
}

.avatar-placeholder {
  font-size: 80rpx;
}

.avatar-img {
  width: 100%;
  height: 100%;
}

.avatar-hint {
  margin-top: 20rpx;
  font-size: 24rpx;
  color: $primary;
  background: $primary-light;
  padding: 6rpx 24rpx;
  border-radius: $radius-pill;
}

.form-counter {
  font-size: 20rpx;
  color: $text-4;
  text-align: right;
  margin-top: 4rpx;
  display: block;
}

.radio-group,
.gender-row {
  display: flex;
  gap: 20rpx;
}

.radio-item,
.gender-opt {
  flex: 1;
  height: 84rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid $border;
  border-radius: $radius-input;
  font-size: 28rpx;
  background: $bg-card;
  transition: all 0.2s;

  &.selected {
    border-color: $primary;
    background: $primary-light;
    color: $primary;
    font-weight: 600;
  }
}

.upload-progress {
  margin-top: 24rpx;
}

.progress-bar {
  width: 100%;
  height: 8rpx;
  background: $divider;
  border-radius: 4rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, $primary, #ff9a56);
  border-radius: 4rpx;
  transition: width 0.3s;
}

.progress-text {
  font-size: 22rpx;
  color: $text-3;
  text-align: center;
  margin-top: 8rpx;
  display: block;
}

.saved-heading {
  display: block;
  margin-bottom: 20rpx;
}

.pet-list-card {
  display: flex;
  align-items: center;
  gap: 28rpx;
  box-sizing: border-box;
}

.section :deep(.u-swipe-action-item) {
  margin-bottom: 20rpx;
  border-radius: $radius-card;
  overflow: hidden;
}

.pet-list-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: $bg-page;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  flex-shrink: 0;
  overflow: hidden;
}

.pet-list-avatar-img {
  width: 100%;
  height: 100%;
}

.pet-list-info {
  flex: 1;
  min-width: 0;
}

.pet-list-name {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: $text-1;
}

.pet-list-meta {
  display: block;
  font-size: 24rpx;
  color: $text-3;
  margin-top: 4rpx;
}
</style>
