import { ref, computed } from 'vue'

const STORAGE_KEY = 'pet_health_theme'

export const themeMode = ref('dark')

export const themeClass = computed(() => `theme-${themeMode.value}`)

export const isDark = computed(() => themeMode.value === 'dark')

export function initTheme() {
  try {
    const saved = uni.getStorageSync(STORAGE_KEY)
    if (saved === 'dark' || saved === 'light') {
      themeMode.value = saved
    }
  } catch (_) {}
}

export function setTheme(mode) {
  if (mode !== 'light' && mode !== 'dark') return
  themeMode.value = mode
  try {
    uni.setStorageSync(STORAGE_KEY, mode)
  } catch (_) {}
}

export function toggleTheme() {
  setTheme(themeMode.value === 'light' ? 'dark' : 'light')
}
