<template>
  <view class="theme-toggle press-soft" @click.stop="onToggle" :aria-label="isDark ? '切换浅色' : '切换深色'">
    <view class="theme-toggle__track" :class="{ 'is-dark': isDark }">
      <view class="theme-toggle__thumb">
        <text class="theme-toggle__icon">{{ isDark ? '🌙' : '☀️' }}</text>
      </view>
      <text class="theme-toggle__hint theme-toggle__hint--light">亮</text>
      <text class="theme-toggle__hint theme-toggle__hint--dark">暗</text>
    </view>
  </view>
</template>

<script setup>
import { isDark, toggleTheme } from '@/store/theme.js'

function onToggle() {
  toggleTheme()
  uni.vibrateShort?.({ type: 'light' })
}
</script>

<style lang="scss" scoped>
.theme-toggle {
  flex-shrink: 0;
}

.theme-toggle__track {
  position: relative;
  width: 88rpx;
  height: 48rpx;
  border-radius: 999rpx;
  background: var(--primary-light);
  border: 2rpx solid var(--border);
  box-shadow: inset 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  transition: background 0.35s ease, border-color 0.35s ease;

  &.is-dark {
    background: rgba(255, 154, 102, 0.2);
  }
}

.theme-toggle__thumb {
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: var(--bg-card);
  box-shadow: 0 4rpx 12rpx var(--primary-glow);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.35s cubic-bezier(0.34, 1.4, 0.64, 1);
}

.theme-toggle__track.is-dark .theme-toggle__thumb {
  transform: translateX(40rpx);
}

.theme-toggle__icon {
  font-size: 22rpx;
  line-height: 1;
}

.theme-toggle__hint {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18rpx;
  color: var(--text-4);
  opacity: 0.7;
  pointer-events: none;

  &--light { left: 12rpx; }
  &--dark { right: 12rpx; }
}
</style>
