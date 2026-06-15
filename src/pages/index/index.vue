<template>
  <view class="landing page-shell">
    <AppNav title="宠物健康日志" />

    <view class="hero">
        <view class="hero-logo">🐾</view>
        <text class="hero-title">毛孩子健康本</text>
        <text class="hero-desc">科学养宠 · 按时驱虫 · 记录成长</text>
      </view>

      <view class="section">
        <text class="section-label">功能入口</text>
        <view class="feature-list">
          <view class="feature-card" @click="goDashboard">
            <view class="fc-icon i1">🏠</view>
            <view class="fc-info">
              <text class="fc-title">核心健康看板</text>
              <text class="fc-desc">驱虫倒计时 · 疫苗提醒 · 用药清单</text>
            </view>
            <text class="fc-arrow">›</text>
          </view>

          <view class="feature-card" @click="goWeight">
            <view class="fc-icon i2">📊</view>
            <view class="fc-info">
              <text class="fc-title">体重管理</text>
              <text class="fc-desc">每日打卡 · 趋势曲线 · 历史记录</text>
            </view>
            <text class="fc-arrow">›</text>
          </view>

          <view class="feature-card" @click="goMedical">
            <view class="fc-icon i3">💊</view>
            <view class="fc-info">
              <text class="fc-title">医嘱录入</text>
              <text class="fc-desc">动态药方 · 用药计划 · 一键添加</text>
            </view>
            <text class="fc-arrow">›</text>
          </view>

          <view class="feature-card" @click="goArchive">
            <view class="fc-icon i4">📝</view>
            <view class="fc-info">
              <text class="fc-title">宠物档案</text>
              <text class="fc-desc">头像上传 · 品种选择 · 生日记录</text>
            </view>
            <text class="fc-arrow">›</text>
          </view>
        </view>
      </view>

      <view class="footer">
        <text>毛孩子健康本 · 让每只宝贝健康成长</text>
      </view>
  </view>
</template>

<script setup>
import AppNav from '@/components/AppNav/index.vue'

function goDashboard() {
  uni.reLaunch({ url: '/pages/home/index' })
}
function goWeight() {
  uni.reLaunch({ url: '/pages/weight/index' })
}
function goMedical() {
  uni.reLaunch({ url: '/pages/medical/index' })
}
function goArchive() {
  uni.reLaunch({ url: '/pages/archive/index' })
}
</script>

<style lang="scss" scoped>
.hero {
  text-align: center;
  padding: 64rpx 48rpx 48rpx;
}

.hero-logo {
  width: 144rpx;
  height: 144rpx;
  background: linear-gradient(135deg, #ff9a56, $primary);
  border-radius: 40rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 72rpx;
  margin-bottom: 28rpx;
  box-shadow: 0 8rpx 36rpx rgba(255, 125, 63, 0.22);
}

.hero-title {
  display: block;
  font-size: 52rpx;
  font-weight: 700;
  color: $text-1;
  letter-spacing: 2rpx;
}

.hero-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: $text-3;
}

.section {
  padding: 0 32rpx 32rpx;
}

.section-label {
  font-size: 24rpx;
  color: $text-3;
  letter-spacing: 2rpx;
  padding: 0 8rpx 20rpx;
  display: block;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.feature-card {
  display: flex;
  align-items: center;
  gap: 28rpx;
  background: $bg-card;
  border-radius: $radius-card;
  padding: 32rpx;
  box-shadow: $shadow-card;
  transition: transform 0.15s;

  &:active {
    transform: scale(0.985);
    box-shadow: $shadow-card-hover;
  }
}

.fc-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  flex-shrink: 0;

  &.i1 { background: $primary-light; }
  &.i2 { background: $success-light; }
  &.i3 { background: $warning-light; }
  &.i4 { background: #f0f0ff; }
}

.fc-info {
  flex: 1;
  min-width: 0;
}

.fc-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: $text-1;
}

.fc-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: $text-3;
  line-height: 1.4;
}

.fc-arrow {
  color: $text-4;
  font-size: 40rpx;
  flex-shrink: 0;
  line-height: 1;
}

.footer {
  text-align: center;
  padding: 32rpx 48rpx 48rpx;
  font-size: 24rpx;
  color: $text-4;
}
</style>
