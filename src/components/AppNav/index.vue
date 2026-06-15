<template>
  <view class="app-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
    <view class="app-nav__inner">
      <view class="app-nav__left">
        <view v-if="showBack" class="app-nav__back" @click="onBack">
          <text class="app-nav__back-icon">‹</text>
        </view>
      </view>
      <text class="app-nav__title">{{ title }}</text>
      <view class="app-nav__right">
        <text v-if="actionText" class="app-nav__action" @click="$emit('action')">{{ actionText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  showBack: { type: Boolean, default: false },
  backToIndex: { type: Boolean, default: false },
  actionText: { type: String, default: '' }
})

const emit = defineEmits(['action', 'back'])

const statusBarHeight = ref(0)

onMounted(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 0
  } catch (_) {
    statusBarHeight.value = 0
  }
})

function onBack() {
  emit('back')
  if (props.backToIndex) {
    uni.reLaunch({ url: '/pages/index/index' })
    return
  }
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.reLaunch({ url: '/pages/index/index' })
  }
}
</script>

<style lang="scss" scoped>
.app-nav {
  flex-shrink: 0;
  z-index: 200;
  background: rgba(255, 255, 255, 0.96);
  border-bottom: 1px solid $divider;
}

.app-nav__inner {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 24rpx;
}

.app-nav__left,
.app-nav__right {
  width: 120rpx;
  flex-shrink: 0;
}

.app-nav__right {
  display: flex;
  justify-content: flex-end;
}

.app-nav__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;

  &:active {
    background: $divider;
  }
}

.app-nav__back-icon {
  font-size: 48rpx;
  color: $text-1;
  line-height: 1;
  margin-top: -4rpx;
}

.app-nav__title {
  flex: 1;
  text-align: center;
  font-size: 34rpx;
  font-weight: 600;
  color: $text-1;
}

.app-nav__action {
  font-size: 26rpx;
  color: $primary;
  padding: 8rpx 16rpx;
  border-radius: $radius-btn;
  white-space: nowrap;

  &:active {
    background: $primary-light;
  }
}
</style>
