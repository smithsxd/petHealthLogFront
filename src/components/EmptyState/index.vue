<template>
  <view class="empty-state">
    <view class="empty-state__icon-wrap">
      <text class="empty-state__icon">{{ icon }}</text>
    </view>
    <text class="empty-state__title">{{ title }}</text>
    <text v-if="desc" class="empty-state__desc">{{ desc }}</text>
    <view v-if="actionText" class="empty-state__btn" @click="$emit('action')">{{ actionText }}</view>
  </view>
</template>

<script setup>
defineProps({
  icon: { type: String, default: '📋' },
  title: { type: String, default: '暂无数据' },
  desc: { type: String, default: '' },
  actionText: { type: String, default: '' }
})

defineEmits(['action'])
</script>

<style lang="scss" scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 48rpx;

  &__icon-wrap {
    width: 140rpx;
    height: 140rpx;
    background: $bg-page;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24rpx;
  }

  &__icon {
    font-size: 64rpx;
  }

  &__title {
    font-size: 30rpx;
    font-weight: 600;
    color: $text-1;
    margin-bottom: 8rpx;
  }

  &__desc {
    font-size: 26rpx;
    color: $text-3;
    text-align: center;
    line-height: 1.5;
  }

  &__btn {
    margin-top: 32rpx;
    padding: 16rpx 48rpx;
    background: linear-gradient(135deg, $primary, $primary-dark);
    color: #fff;
    font-size: 28rpx;
    font-weight: 600;
    border-radius: $radius-pill;
  }
}
</style>
