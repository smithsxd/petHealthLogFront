<template>
  <view class="landing page-shell theme-root" :class="themeClass">
    <view class="landing__glow landing__glow--1" />
    <view class="landing__glow landing__glow--2" />

    <AppNav title="宠物健康日志" :show-theme-toggle="true" />

    <view class="hero anim-fade-up">
      <view class="hero-logo anim-breathe">🐾</view>
      <text class="hero-title">毛孩子健康本</text>
      <text class="hero-desc">科学养宠 · 按时驱虫 · 记录成长</text>
    </view>

    <view class="section">
      <text class="section-label anim-fade-up delay-1">功能入口</text>
      <view class="feature-list">
        <view
          v-for="(item, i) in features"
          :key="item.key"
          class="feature-card press-soft anim-fade-up"
          :class="'delay-' + (i + 2)"
          @click="item.go"
        >
          <view class="fc-icon" :class="item.iconClass">{{ item.icon }}</view>
          <view class="fc-info">
            <text class="fc-title">{{ item.title }}</text>
            <text class="fc-desc">{{ item.desc }}</text>
          </view>
          <text class="fc-arrow">›</text>
        </view>

        <!-- 就医指南入口 — 宠物档案下方 -->
        <view class="guide-entry press-soft anim-fade-up delay-6" @click="goReview">
          <view class="guide-entry__border" />
          <view class="guide-entry__inner">
            <view class="guide-entry__content">
              <text class="guide-entry__title">就医指南 🧾</text>
              <text class="guide-entry__sub">已有 {{ verifiedCount }} 位宠友真实验单 · 本城红黑榜一键查</text>
            </view>
            <view class="guide-entry__arrow">
              <text class="arrow-glow">›</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="footer anim-fade-up delay-7">
      <text>毛孩子健康本 · 让每只宝贝健康成长</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppNav from '@/components/AppNav/index.vue'
import { themeClass } from '@/store/theme.js'
import { countVerifiedReviews } from '@/cloud/review.js'

const verifiedCount = ref(0)

const features = [
  {
    key: 'home',
    icon: '🏠',
    iconClass: 'i1',
    title: '核心健康看板',
    desc: '驱虫倒计时 · 疫苗提醒 · 用药清单',
    go: () => uni.reLaunch({ url: '/pages/home/index' })
  },
  {
    key: 'weight',
    icon: '📊',
    iconClass: 'i2',
    title: '体重管理',
    desc: '每日打卡 · 趋势曲线 · 历史记录',
    go: () => uni.reLaunch({ url: '/pages/weight/index' })
  },
  {
    key: 'medical',
    icon: '💊',
    iconClass: 'i3',
    title: '医嘱录入',
    desc: '动态药方 · 用药计划 · 一键添加',
    go: () => uni.reLaunch({ url: '/pages/medical/index' })
  },
  {
    key: 'archive',
    icon: '📝',
    iconClass: 'i4',
    title: '宠物档案',
    desc: '头像上传 · 品种选择 · 生日记录',
    go: () => uni.reLaunch({ url: '/pages/archive/index' })
  }
]

function goReview() {
  uni.reLaunch({ url: '/pages/review/index' })
}

async function refreshVerifiedCount() {
  try {
    verifiedCount.value = await countVerifiedReviews()
  } catch (_) {
    verifiedCount.value = 0
  }
}

onShow(() => {
  refreshVerifiedCount()
})
</script>

<style lang="scss" scoped>
.landing {
  position: relative;
  overflow: hidden;
}

.landing__glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(40rpx);
}

.landing__glow--1 {
  width: 360rpx;
  height: 360rpx;
  top: -80rpx;
  right: -60rpx;
  background: var(--primary-glow);
  opacity: 0.5;
}

.landing__glow--2 {
  width: 280rpx;
  height: 280rpx;
  bottom: 200rpx;
  left: -80rpx;
  background: rgba(255, 182, 193, 0.35);
  opacity: 0.4;
}

.theme-dark .landing__glow--2 {
  background: rgba(180, 140, 255, 0.25);
}

.hero {
  text-align: center;
  padding: 64rpx 48rpx 48rpx;
  position: relative;
  z-index: 1;
}

.hero-logo {
  width: 152rpx;
  height: 152rpx;
  background: linear-gradient(135deg, #ff9a56, var(--primary));
  border-radius: 44rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 76rpx;
  margin-bottom: 28rpx;
  box-shadow: var(--shadow-soft);
}

.hero-title {
  display: block;
  font-size: 52rpx;
  font-weight: 700;
  color: var(--text-1);
  letter-spacing: 2rpx;
}

.hero-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: var(--text-3);
}

.section {
  padding: 0 32rpx 32rpx;
  position: relative;
  z-index: 1;
}

.section-label {
  font-size: 24rpx;
  color: var(--text-3);
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
  background: var(--bg-card-gradient);
  border-radius: 32rpx;
  padding: 32rpx;
  box-shadow: var(--shadow-card);
  border: 1rpx solid var(--border);

  &:active {
    box-shadow: var(--shadow-card-hover);
  }
}

.fc-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  flex-shrink: 0;

  &.i1 { background: var(--primary-light); }
  &.i2 { background: var(--success-light); }
  &.i3 { background: var(--warning-light); }
  &.i4 { background: var(--badge-purple); }
}

.fc-info {
  flex: 1;
  min-width: 0;
}

.fc-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: var(--text-1);
}

.fc-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: var(--text-3);
  line-height: 1.4;
}

.fc-arrow {
  color: var(--primary);
  font-size: 40rpx;
  flex-shrink: 0;
  line-height: 1;
  opacity: 0.7;
}

/* 就医指南流光边框卡片 */
.guide-entry {
  position: relative;
  border-radius: 32rpx;
  overflow: hidden;
  margin-top: 4rpx;
}

.guide-entry__border {
  position: absolute;
  inset: 0;
  border-radius: 32rpx;
  padding: 2rpx;
  background: linear-gradient(
    135deg,
    rgba(255, 154, 102, 0.6),
    rgba(74, 222, 128, 0.4),
    rgba(180, 160, 255, 0.5),
    rgba(255, 154, 102, 0.6)
  );
  background-size: 300% 300%;
  animation: border-flow 4s ease infinite;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}

@keyframes border-flow {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.guide-entry__inner {
  position: relative;
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 32rpx;
  margin: 2rpx;
  border-radius: 30rpx;
  background: rgba(20, 18, 30, 0.72);
  backdrop-filter: blur(12rpx);
}

.theme-light .guide-entry__inner {
  background: rgba(30, 28, 40, 0.85);
}

.guide-entry__content {
  flex: 1;
  min-width: 0;
}

.guide-entry__title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #f5f0fa;
  letter-spacing: 1rpx;
}

.guide-entry__sub {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.45;
}

.guide-entry__arrow {
  flex-shrink: 0;
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.arrow-glow {
  font-size: 44rpx;
  color: var(--primary);
  line-height: 1;
  text-shadow: 0 0 16rpx rgba(255, 154, 102, 0.8), 0 0 32rpx rgba(255, 154, 102, 0.4);
  animation: arrow-pulse 2s ease-in-out infinite;
}

@keyframes arrow-pulse {
  0%, 100% { opacity: 0.7; transform: translateX(0); }
  50% { opacity: 1; transform: translateX(4rpx); }
}

.footer {
  text-align: center;
  padding: 32rpx 48rpx 48rpx;
  font-size: 24rpx;
  color: var(--text-4);
  position: relative;
  z-index: 1;
}

.delay-1 { animation-delay: 0.06s; }
.delay-2 { animation-delay: 0.12s; }
.delay-3 { animation-delay: 0.19s; }
.delay-4 { animation-delay: 0.26s; }
.delay-5 { animation-delay: 0.33s; }
.delay-6 { animation-delay: 0.4s; }
.delay-7 { animation-delay: 0.48s; }
</style>
