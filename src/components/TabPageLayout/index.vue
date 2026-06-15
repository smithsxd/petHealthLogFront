<template>
  <view class="tab-page-layout theme-root" :class="themeClass">
    <view class="tab-page-layout__header">
      <AppNav
        :title="title"
        :show-back="showBack"
        :back-to-index="backToIndex"
        :action-text="actionText"
        :show-theme-toggle="showThemeToggle"
        @action="$emit('nav-action')"
      />
    </view>

    <view class="tab-page-layout__body" :style="bodyStyle">
      <slot />
      <view class="tab-page-layout__spacer" />
    </view>

    <view class="tab-page-layout__footer">
      <AppTabBar :current="tabCurrent" embedded />
    </view>

    <slot name="overlay" />
    <slot name="extra" />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import AppNav from '@/components/AppNav/index.vue'
import AppTabBar from '@/components/AppTabBar/index.vue'
import { themeClass } from '@/store/theme.js'

defineProps({
  title: { type: String, default: '' },
  showBack: { type: Boolean, default: false },
  backToIndex: { type: Boolean, default: false },
  actionText: { type: String, default: '' },
  tabCurrent: { type: String, required: true },
  showThemeToggle: { type: Boolean, default: true }
})

defineEmits(['nav-action'])

const bodyStyle = ref(calcBodyStyle())

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
    return {
      paddingTop: '88px',
      paddingBottom: '100px',
      minHeight: '100vh',
      boxSizing: 'border-box'
    }
  }
}
</script>

<style lang="scss" scoped>
.tab-page-layout {
  box-sizing: border-box;
}

.tab-page-layout__header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
}

.tab-page-layout__body {
  width: 100%;
}

.tab-page-layout__footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

.tab-page-layout__spacer {
  height: 32rpx;
}
</style>
