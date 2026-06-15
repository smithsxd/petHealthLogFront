<script>
import { CLOUD_ENV_ID } from '@/cloud/config.js'
import { loadPets } from '@/store/pet.js'

export default {
  onLaunch() {
    // #ifdef MP-WEIXIN
    if (wx.cloud) {
      wx.cloud.init({
        env: CLOUD_ENV_ID,
        traceUser: true
      })
    } else {
      console.error('[cloud] wx.cloud 不可用，请确认 manifest 已开启 cloud 且 AppID 为正式号')
    }
    loadPets()
    // #endif
  },
  onShow() {},
  onHide() {}
}
</script>

<style lang="scss">
@import '@/styles/common.scss';
@import 'uview-plus/index.scss';

page {
  background-color: $bg-page;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: $text-1;
}
</style>
