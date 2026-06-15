<template>
  <view class="tab-page-layout">
    <AppNav
      :title="title"
      :show-back="showBack"
      :back-to-index="backToIndex"
      :action-text="actionText"
      @action="$emit('nav-action')"
    />

    <view class="tab-page-layout__body">
      <slot />
      <view class="tab-page-layout__spacer" />
    </view>

    <AppTabBar :current="tabCurrent" />

    <slot name="overlay" />
    <slot name="extra" />
  </view>
</template>

<script setup>
import AppNav from '@/components/AppNav/index.vue'
import AppTabBar from '@/components/AppTabBar/index.vue'

defineProps({
  title: { type: String, default: '' },
  showBack: { type: Boolean, default: false },
  backToIndex: { type: Boolean, default: false },
  actionText: { type: String, default: '' },
  tabCurrent: { type: String, required: true }
})

defineEmits(['nav-action'])
</script>

<style lang="scss" scoped>
/* 页面自然滚动，避免 scroll-view 内 canvas 错位/timeout */
.tab-page-layout {
  min-height: 100vh;
  background: $bg-page;
  box-sizing: border-box;
}

.tab-page-layout__spacer {
  height: calc(100rpx + constant(safe-area-inset-bottom) + 16rpx);
  height: calc(100rpx + env(safe-area-inset-bottom) + 16rpx);
}
</style>
