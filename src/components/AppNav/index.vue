<template>
  <view class="app-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
    <view class="app-nav__inner">
      <view class="app-nav__left">
        <view v-if="showBack" class="app-nav__back press-soft" @click="onBack">
          <text class="app-nav__back-icon">‹</text>
        </view>
        <view v-if="showBack && (showThemeToggle || actionText)" class="app-nav__left-actions">
          <ThemeToggle v-if="showThemeToggle" class="app-nav__theme" />
          <text v-if="actionText" class="app-nav__action press-soft" @click="$emit('action')">{{ actionText }}</text>
        </view>
        <ThemeToggle v-else-if="showThemeToggle" />
      </view>
      <text class="app-nav__title">{{ title }}</text>
      <view class="app-nav__right">
        <text v-if="actionText && !showBack" class="app-nav__action press-soft" @click="$emit('action')">{{ actionText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ThemeToggle from '@/components/ThemeToggle/index.vue'

const props = defineProps({
  title: { type: String, default: '' },
  showBack: { type: Boolean, default: false },
  backToIndex: { type: Boolean, default: false },
  actionText: { type: String, default: '' },
  showThemeToggle: { type: Boolean, default: true }
})

const emit = defineEmits(['action', 'back'])

const statusBarHeight = ref(getStatusBarHeight())

function getStatusBarHeight() {
  try {
    return uni.getSystemInfoSync().statusBarHeight || 0
  } catch (_) {
    return 0
  }
}

onMounted(() => {
  statusBarHeight.value = getStatusBarHeight()
})

function onBack() {
  emit('back')
  if (props.backToIndex) {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      uni.navigateBack()
      return
    }
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
  background: var(--bg-nav);
  border-bottom: 1px solid var(--divider);
  backdrop-filter: blur(12px);
  transition: background 0.35s ease, border-color 0.35s ease;
}

.app-nav__inner {
  position: relative;
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 24rpx 0 36rpx;
}

.app-nav__left,
.app-nav__right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.app-nav__left {
  position: relative;
  z-index: 2;
  justify-content: flex-start;
  min-width: 280rpx;
  max-width: 360rpx;
}

.app-nav__right {
  position: relative;
  z-index: 2;
  justify-content: flex-end;
  gap: 12rpx;
  width: 140rpx;
}

.app-nav__left-actions {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-left: 20rpx;
}

.app-nav__theme {
  margin-right: 4rpx;
}

.app-nav__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;

  &:active {
    background: var(--divider);
  }
}

.app-nav__back-icon {
  font-size: 48rpx;
  color: var(--text-1);
  line-height: 1;
  margin-top: -4rpx;
}

.app-nav__title {
  position: absolute;
  left: 200rpx;
  right: 160rpx;
  text-align: center;
  font-size: 34rpx;
  font-weight: 600;
  color: var(--text-1);
  pointer-events: none;
}

.app-nav__action {
  font-size: 26rpx;
  color: var(--primary);
  padding: 8rpx 16rpx;
  border-radius: $radius-btn;
  white-space: nowrap;

  &:active {
    background: var(--primary-light);
  }
}
</style>
