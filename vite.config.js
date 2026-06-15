import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

const define = {}
if (!['mp-weixin', 'h5', 'web'].includes(process.env.UNI_PLATFORM || '')) {
  define.global = null
  define.wx = 'uni'
}

export default defineConfig({
  plugins: [uni()],
  define,
  server: {
    port: 9527
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@import "@/styles/variables.scss"; @import "@/uview-theme-bridge.scss";'
      }
    }
  }
})
