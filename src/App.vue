<script>
import { CLOUD_ENV_ID, setCloudInited, ensureCloud } from '@/cloud/config.js'
import { loadPets } from '@/store/pet.js'
import { initTheme } from '@/store/theme.js'

export default {
  async onLaunch() {
    initTheme()
    // #ifdef MP-WEIXIN
    try {
      if (!wx.cloud) {
        console.error('[cloud] wx.cloud 不可用，请确认 manifest 已开启 cloud 且 AppID 为正式号')
        setCloudInited(new Error('wx.cloud 不可用'))
        return
      }
      ensureCloud()
      setCloudInited()
      console.log('[cloud] 初始化完成，环境:', CLOUD_ENV_ID)
      loadPets().catch((err) => {
        console.error('[cloud] 首次加载宠物失败', err)
      })
    } catch (err) {
      console.error('[cloud] 初始化失败', err)
      setCloudInited(err)
    }
    // #endif
  },
  onShow() {},
  onHide() {}
}
</script>

<style lang="scss">
@import '@/styles/themes.scss';
@import '@/styles/common.scss';
@import 'uview-plus/index.scss';

page {
  background: transparent;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: var(--text-1, #303133);
}
</style>
