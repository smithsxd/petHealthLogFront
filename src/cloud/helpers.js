export function petEmoji(type) {
  if (type === 'dog') return '🐶'
  if (type === 'cat') return '🐱'
  return '🐹'
}

export function typeLabel(type, customType) {
  if (type === 'cat') return '猫咪'
  if (type === 'dog') return '狗狗'
  if (customType) return customType
  return '其他'
}

export function genderLabel(gender) {
  return gender === 'male' ? '弟弟' : '妹妹'
}

export function reminderTypeLabel(type) {
  const map = {
    external_parasite: '体外驱虫',
    internal_parasite: '体内驱虫',
    vaccine: '疫苗'
  }
  return map[type] || '健康提醒'
}

export function formatDisplayDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${y}年${m}月${d}日`
}

export function formatShortDate(iso) {
  if (!iso) return ''
  const parts = iso.split('-')
  return parts.length >= 3 ? `${parts[1]}-${parts[2]}` : iso
}

export function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function daysUntil(dateISO) {
  if (!dateISO) return 0
  const target = new Date(dateISO.replace(/-/g, '/'))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86400000)
}

export function addDaysISO(iso, days) {
  const d = new Date(iso.replace(/-/g, '/'))
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function reminderCycleDays(type) {
  return type === 'vaccine' ? 365 : 30
}

export function buildCountdown(reminder) {
  if (reminder.status === 'completed') {
    return {
      _id: reminder._id,
      label: reminderTypeLabel(reminder.type),
      drug: reminder.item_name,
      lastDate: formatShortDate(reminder.last_date),
      expectedDate: formatShortDate(reminder.next_date),
      daysLeft: 0,
      absDays: 0,
      isOverdue: false,
      state: 'done',
      stateLabel: '已完成',
      progress: 100,
      raw: reminder
    }
  }
  const daysLeft = daysUntil(reminder.next_date)
  const absDays = Math.abs(daysLeft)
  const isOverdue = daysLeft < 0
  const state = daysLeft > 7 ? 'safe' : daysLeft >= 0 ? 'warn' : 'danger'
  const cycleDays = reminderCycleDays(reminder.type)
  const progress = Math.min(Math.max((cycleDays - daysLeft) / cycleDays, 0), 1)
  return {
    _id: reminder._id,
    label: reminderTypeLabel(reminder.type),
    drug: reminder.item_name,
    lastDate: formatShortDate(reminder.last_date),
    expectedDate: formatShortDate(reminder.next_date),
    daysLeft,
    absDays,
    isOverdue,
    state,
    stateLabel: state === 'safe' ? '安心' : state === 'warn' ? '预警' : '超期',
    progress: Math.round(progress * 100),
    raw: reminder
  }
}

export function freqToTag(freq) {
  if (!freq) return { tag: '用药', tagClass: 'morning' }
  if (freq.includes('1次') && !freq.includes('2') && !freq.includes('3')) {
    return { tag: '每日', tagClass: 'morning' }
  }
  if (freq.includes('2次')) return { tag: '每日', tagClass: 'noon' }
  if (freq.includes('3次')) return { tag: '每日', tagClass: 'evening' }
  return { tag: '用药', tagClass: 'morning' }
}
