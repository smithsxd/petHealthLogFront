<template>
  <view class="app-tabbar" :class="{ 'app-tabbar--embedded': embedded }">
    <view
      v-for="item in tabs"
      :key="item.path"
      class="app-tabbar__item press-soft"
      :class="{ active: current === item.key }"
      @click="switchTab(item.path)"
    >
      <view class="app-tabbar__icon-wrap" :class="{ active: current === item.key }">
        <u-icon
          :name="current === item.key ? item.iconActive : item.icon"
          :color="current === item.key ? activeColor : inactiveColor"
          size="22"
        />
      </view>
      <text class="app-tabbar__text">{{ item.text }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { isDark } from '@/store/theme.js'

defineProps({
  current: {
    type: String,
    required: true
  },
  embedded: {
    type: Boolean,
    default: false
  }
})

const inactiveColor = computed(() => (isDark.value ? '#9a8fb0' : '#909399'))
const activeColor = computed(() => (isDark.value ? '#ff9a66' : '#ff7d3f'))

const tabs = [
  { key: 'home', path: '/pages/home/index', text: '看板', icon: 'home', iconActive: 'home-fill' },
  { key: 'weight', path: '/pages/weight/index', text: '体重', icon: 'grid', iconActive: 'grid-fill' },
  { key: 'medical', path: '/pages/medical/index', text: '医嘱', icon: 'file-text', iconActive: 'file-text-fill' },
  { key: 'archive', path: '/pages/archive/index', text: '档案', icon: 'account', iconActive: 'account-fill' },
  { key: 'review', path: '/pages/review/index', text: '指南', icon: 'bookmark', iconActive: 'bookmark-fill' }
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
  background: var(--bg-tabbar);
  border-top: 1px solid var(--divider);
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -4rpx 24rpx rgba(0, 0, 0, 0.06);
  transition: background 0.35s ease;

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
  color: var(--text-3);
  font-size: 18rpx;
  gap: 2rpx;
  position: relative;
  min-width: 0;

  &.active {
    color: var(--primary);

    .app-tabbar__text {
      font-weight: 600;
    }
  }
}

.app-tabbar__icon-wrap {
  width: 72rpx;
  height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 26rpx;
  transition: background 0.28s ease, transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1);

  &.active {
    background: var(--primary-light);
    transform: scale(1.05);
    animation: tab-pop 0.4s cubic-bezier(0.34, 1.4, 0.64, 1);
  }
}

.app-tabbar__text {
  font-size: 18rpx;
  line-height: 1.2;
  transition: color 0.25s ease;
}
</style>
