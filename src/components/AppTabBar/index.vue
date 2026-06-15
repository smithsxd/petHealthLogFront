<template>
  <view class="app-tabbar" :class="{ 'app-tabbar--embedded': embedded }">
    <view
      v-for="item in tabs"
      :key="item.path"
      class="app-tabbar__item"
      :class="{ active: current === item.key }"
      @click="switchTab(item.path)"
    >
      <text class="app-tabbar__icon">{{ item.icon }}</text>
      <text class="app-tabbar__text">{{ item.text }}</text>
    </view>
  </view>
</template>

<script setup>
defineProps({
  current: {
    type: String,
    required: true
  },
  /** 嵌入 TabPageLayout 时使用，取消 fixed 定位 */
  embedded: {
    type: Boolean,
    default: false
  }
})

const tabs = [
  { key: 'home', path: '/pages/home/index', text: '看板', icon: '🏠' },
  { key: 'weight', path: '/pages/weight/index', text: '体重', icon: '📊' },
  { key: 'medical', path: '/pages/medical/index', text: '医嘱', icon: '💊' },
  { key: 'archive', path: '/pages/archive/index', text: '档案', icon: '📝' }
]

function switchTab(path) {
  const pages = getCurrentPages()
  const route = pages.length ? `/${pages[pages.length - 1].route}` : ''
  if (route === path) return
  uni.reLaunch({ url: path })
}
</script>

<style lang="scss" scoped>
.app-tabbar {
  display: flex;
  background: rgba(255, 255, 255, 0.98);
  border-top: 1px solid $divider;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -2rpx 16rpx rgba(0, 0, 0, 0.04);

  &:not(.app-tabbar--embedded) {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 999;
  }
}

.app-tabbar__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100rpx;
  color: $text-3;
  font-size: 20rpx;
  gap: 4rpx;

  &.active {
    color: $primary;
  }

  &:active {
    opacity: 0.7;
  }
}

.app-tabbar__icon {
  font-size: 40rpx;
  line-height: 1;
}

.app-tabbar__text {
  font-size: 20rpx;
  line-height: 1.2;
}
</style>
