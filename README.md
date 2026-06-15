# 🐾 宠物健康日志 (PetHealthLogFront)

> 基于 **uni-app + Vue 3 + UView Plus** 的微信小程序前端  
> 记录宠物健康点滴，关爱宠物每一天

---

## 📱 功能模块

| Tab | 页面 | 功能 |
|-----|------|------|
| 首页 | `pages/home/index` | 驱虫疫苗倒计时、今日用药清单 |
| 体重 | `pages/weight/index` | 体重记录、趋势图表、左滑删除历史 |
| 医嘱 | `pages/medical/index` | 医嘱录入、药方计划 |
| 档案 | `pages/archive/index` | 宠物档案、头像上传 |

---

## 🚀 快速启动

```bash
npm install

# 微信小程序开发（推荐）
npm run dev:mp-weixin
# → 微信开发者工具导入 dist/dev/mp-weixin（开发模式，保存后自动热更新）

# H5 开发
npm run dev:h5
```

### 生产构建

```bash
npm run build:mp-weixin
# → 微信开发者工具导入 dist/build/mp-weixin 后上传
```

---

## 🎨 设计规范

- **主色**：`#ff7d3f`（暖橙）
- **背景**：`#f5f7fa`
- **设计令牌**：`src/styles/variables.scss`
- **公共样式**：`src/styles/common.scss`
- **公共组件**：`AppNav`（导航栏 + 安全区）、`PetBar`（宠物切换）

---

## 📊 图表（lime-echart）

体重页使用 [lime-echart](https://ext.dcloud.net.cn/plugin?id=4899) 实现 H5 / 微信小程序双端图表：

- H5：按需引入 `echarts/core`
- 小程序：使用 `src/static/echarts.min.js`（开发/生产均会复制到输出目录 `static/`）

---

## ☁️ 微信云开发

- 环境 ID：`cloud1`（在 `App.vue` 中 `wx.cloud.init` 初始化）
- 数据集合：`pets` / `pet_weights` / `pet_reminders` / `pet_medications`
- 全局状态：`src/store/pet.js`（`currentPetId`、宠物列表、联动拉取）
- 开发时保持 `npm run dev:mp-weixin` 运行，微信开发者工具打开 **`dist/dev/mp-weixin`**

### 权限建议

各集合建议配置：**仅创建者可读写**（依赖 `_openid` 自动隔离用户数据）。

---

## 📁 项目结构

```
petHealthLogFront/
├── src/
│   ├── cloud/            # db.js、helpers.js
│   ├── store/            # pet.js 全局宠物状态
│   ├── components/       # AppNav、PetBar、EmptyState
│   ├── pages/            # home / weight / medical / archive
│   ├── static/           # echarts.min.js（小程序图表）
│   ├── styles/           # variables.scss、common.scss
│   ├── uni_modules/      # lime-echart 等插件
│   └── utils/chart.js    # 图表 option 构建
└── scripts/create-tab-icons.mjs
```

---

## ⚙️ 导航说明

- **入口页** `pages/index/index`：功能模块卡片，无底部 Tab
- **子页面**（看板/体重/医嘱/档案）：统一使用 `AppTabBar` 自定义底部导航，**H5 与小程序表现一致**
- 页面切换使用 `uni.reLaunch`，避免页面栈堆积
