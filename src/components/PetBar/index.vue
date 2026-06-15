<template>
  <view class="pet-bar">
    <scroll-view scroll-x class="pet-bar__scroll" enhanced :show-scrollbar="false">
      <view class="pet-bar__list">
        <view
          v-for="(pet, i) in pets"
          :key="pet._id || i"
          class="pet-bar__item press-soft"
          :class="{ active: modelValue === i }"
          @click="$emit('update:modelValue', i)"
        >
          <view class="pet-bar__avatar">
            <image v-if="pet.avatar" class="pet-bar__avatar-img" :src="pet.avatar" mode="aspectFill" />
            <text v-else>{{ pet.emoji }}</text>
          </view>
          <text class="pet-bar__name">{{ pet.name }}</text>
          <view v-if="modelValue === i" class="pet-bar__indicator" />
        </view>
        <view v-if="showAdd" class="pet-bar__item pet-bar__add press-soft" @click="$emit('add')">
          <view class="pet-bar__avatar pet-bar__avatar--add">+</view>
          <text class="pet-bar__name">添加</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
defineProps({
  pets: { type: Array, default: () => [] },
  modelValue: { type: Number, default: 0 },
  showAdd: { type: Boolean, default: false }
})

defineEmits(['update:modelValue', 'add'])
</script>

<style lang="scss" scoped>
.pet-bar {
  background: var(--bg-pet-bar);
  border-bottom: 1px solid var(--divider);
  transition: background 0.35s ease;
}

.pet-bar__scroll {
  white-space: nowrap;
}

.pet-bar__list {
  display: inline-flex;
  padding: 16rpx 16rpx 24rpx;
  gap: 8rpx;
}

.pet-bar__item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 20rpx;
  flex-shrink: 0;
  position: relative;
}

.pet-bar__avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: var(--bg-input);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  border: 3rpx solid transparent;
  transition: border-color 0.28s ease, box-shadow 0.28s ease, transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1);
  overflow: hidden;
}

.pet-bar__avatar-img {
  width: 100%;
  height: 100%;
}

.pet-bar__item.active .pet-bar__avatar {
  border-color: var(--primary);
  box-shadow: 0 0 0 8rpx var(--primary-light);
  transform: scale(1.06);
}

.pet-bar__avatar--add {
  font-size: 40rpx;
  color: var(--text-4);
  border: 3rpx dashed var(--border);
}

.pet-bar__name {
  font-size: 22rpx;
  color: var(--text-3);
  transition: color 0.25s ease;
}

.pet-bar__item.active .pet-bar__name {
  color: var(--primary);
  font-weight: 600;
}

.pet-bar__indicator {
  position: absolute;
  bottom: 0;
  width: 32rpx;
  height: 6rpx;
  border-radius: 999rpx;
  background: var(--primary);
}

.pet-bar__add .pet-bar__name {
  color: var(--text-4);
}
</style>
