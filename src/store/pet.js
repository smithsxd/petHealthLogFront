import { reactive, computed } from 'vue'
import { COLLECTIONS, getDb } from '@/cloud/db.js'
import { cloudGet, sortBy } from '@/cloud/query.js'
import {
  petEmoji,
  typeLabel,
  genderLabel,
  buildCountdown,
  todayISO,
  addDaysISO,
  reminderCycleDays,
  freqToTag
} from '@/cloud/helpers.js'

export const petStore = reactive({
  pets: [],
  currentPetId: '',
  weights: [],
  reminders: [],
  medications: [],
  loadingPets: false,
  loadingWeights: false,
  loadingReminders: false,
  loadingMedications: false
})

export const petBarPets = computed(() =>
  petStore.pets.map((p) => ({
    _id: p._id,
    name: p.name,
    emoji: petEmoji(p.type),
    avatar: p.avatar || ''
  }))
)

export const currentPet = computed(() =>
  petStore.pets.find((p) => p._id === petStore.currentPetId) || null
)

export const currentPetIndex = computed({
  get() {
    const idx = petStore.pets.findIndex((p) => p._id === petStore.currentPetId)
    return idx >= 0 ? idx : 0
  },
  set(index) {
    const pet = petStore.pets[index]
    if (pet) {
      setCurrentPetId(pet._id)
    }
  }
})

export function setCurrentPetId(petId) {
  if (petStore.currentPetId === petId) return
  petStore.currentPetId = petId
  refreshPetData()
}

let loadPetsTask = null

export async function loadPets(options = {}) {
  const { force = false, withRelated = true } = options
  if (loadPetsTask && !force) return loadPetsTask

  loadPetsTask = (async () => {
    petStore.loadingPets = true
    try {
      const db = await getDb()
      const pets = await cloudGet(
        db.collection(COLLECTIONS.PETS).get(),
        { label: 'pets', sort: sortBy('create_time', 'desc') }
      )
      petStore.pets = pets
      if (!petStore.currentPetId && petStore.pets.length) {
        petStore.currentPetId = petStore.pets[0]._id
      } else if (petStore.currentPetId && !petStore.pets.find((p) => p._id === petStore.currentPetId)) {
        petStore.currentPetId = petStore.pets[0]?._id || ''
      }
      if (withRelated) {
        await refreshPetData()
      }
      return petStore.pets
    } catch (err) {
      console.error('[cloud] loadPets failed', err)
      const msg = String(err?.message || err)
      if (!msg.includes('初始化失败') && !msg.includes('不可用')) {
        uni.showToast({ title: '加载宠物失败', icon: 'none' })
      }
      return []
    } finally {
      petStore.loadingPets = false
    }
  })()

  try {
    return await loadPetsTask
  } finally {
    loadPetsTask = null
  }
}

export async function refreshPetData() {
  if (!petStore.currentPetId) {
    petStore.weights = []
    petStore.reminders = []
    petStore.medications = []
    return
  }
  await loadWeights()
  await loadReminders()
  await loadMedications()
}

export async function loadWeights() {
  if (!petStore.currentPetId) return []
  petStore.loadingWeights = true
  try {
    const db = await getDb()
    petStore.weights = await cloudGet(
      db.collection(COLLECTIONS.WEIGHTS).where({ pet_id: petStore.currentPetId }).get(),
      { label: 'pet_weights', sort: sortBy('record_date', 'asc') }
    )
    return petStore.weights
  } catch (err) {
    console.error('[cloud] loadWeights failed', err)
    return []
  } finally {
    petStore.loadingWeights = false
  }
}

export async function loadReminders() {
  if (!petStore.currentPetId) return []
  petStore.loadingReminders = true
  try {
    const db = await getDb()
    petStore.reminders = await cloudGet(
      db.collection(COLLECTIONS.REMINDERS).where({ pet_id: petStore.currentPetId }).get(),
      { label: 'pet_reminders', sort: sortBy('next_date', 'asc') }
    )
    return petStore.reminders
  } catch (err) {
    console.error('[cloud] loadReminders failed', err)
    return []
  } finally {
    petStore.loadingReminders = false
  }
}

export async function loadMedications() {
  if (!petStore.currentPetId) return []
  petStore.loadingMedications = true
  try {
    const db = await getDb()
    petStore.medications = await cloudGet(
      db.collection(COLLECTIONS.MEDICATIONS).where({ pet_id: petStore.currentPetId }).get(),
      { label: 'pet_medications', sort: sortBy('create_time', 'desc') }
    )
    return petStore.medications
  } catch (err) {
    console.error('[cloud] loadMedications failed', err)
    return []
  } finally {
    petStore.loadingMedications = false
  }
}

export const countdownList = computed(() =>
  petStore.reminders.map(buildCountdown)
)

export const ongoingMedication = computed(() =>
  petStore.medications.find((m) => m.status === 'ongoing') || null
)

export const todayMedItems = computed(() => {
  const med = ongoingMedication.value
  if (!med?.plan_list?.length) return []
  return med.plan_list.map((item) => {
    const { tag, tagClass } = freqToTag(item.freq)
    const text = `${item.name}${item.dose ? ` ${item.dose}` : ''}`
    return { text, tag, tagClass, done: false, raw: item }
  })
})

export async function addPet(data) {
  const db = await getDb()
  const res = await db.collection(COLLECTIONS.PETS).add({
    data: {
      ...data,
      create_time: Date.now()
    }
  })
  await loadPets()
  if (res._id) {
    petStore.currentPetId = res._id
  }
  return res
}

export async function updatePet(petId, data) {
  const db = await getDb()
  await db.collection(COLLECTIONS.PETS).doc(petId).update({ data })
  await loadPets()
}

export async function removePet(petId) {
  if (!petId) return
  const db = await getDb()
  await Promise.all([
    db.collection(COLLECTIONS.WEIGHTS).where({ pet_id: petId }).remove(),
    db.collection(COLLECTIONS.REMINDERS).where({ pet_id: petId }).remove(),
    db.collection(COLLECTIONS.MEDICATIONS).where({ pet_id: petId }).remove()
  ])
  await db.collection(COLLECTIONS.PETS).doc(petId).remove()
  if (petStore.currentPetId === petId) {
    petStore.currentPetId = ''
  }
  await loadPets()
}

export async function uploadAvatar(tempFilePath) {
  const cloudPath = `pet_images/${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`
  const res = await wx.cloud.uploadFile({ cloudPath, filePath: tempFilePath })
  return res.fileID
}

export async function addWeight(weight, recordDate) {
  const db = await getDb()
  await db.collection(COLLECTIONS.WEIGHTS).add({
    data: {
      pet_id: petStore.currentPetId,
      weight: Number(weight),
      record_date: recordDate,
      create_time: Date.now()
    }
  })
  await loadWeights()
}

export async function removeWeight(weightId) {
  const db = await getDb()
  await db.collection(COLLECTIONS.WEIGHTS).doc(weightId).remove()
  await loadWeights()
}

export async function renewReminder(reminderId) {
  const reminder = petStore.reminders.find((r) => r._id === reminderId)
  if (!reminder) return
  const today = todayISO()
  const cycle = reminderCycleDays(reminder.type)
  const nextDate = addDaysISO(today, cycle)
  const db = await getDb()
  await db.collection(COLLECTIONS.REMINDERS).doc(reminderId).update({
    data: {
      last_date: today,
      next_date: nextDate,
      is_notified: false
    }
  })
  await loadReminders()
}

export async function addReminder({ type, itemName, expectedDate }) {
  const db = await getDb()
  await db.collection(COLLECTIONS.REMINDERS).add({
    data: {
      pet_id: petStore.currentPetId,
      type,
      item_name: itemName,
      last_date: '',
      next_date: expectedDate,
      status: 'active',
      is_notified: false,
      create_time: Date.now()
    }
  })
  await loadReminders()
}

export async function completeReminder(reminderId) {
  const db = await getDb()
  await db.collection(COLLECTIONS.REMINDERS).doc(reminderId).update({
    data: {
      status: 'completed',
      last_date: todayISO()
    }
  })
  await loadReminders()
}

export async function extendReminder(reminderId, extendDays) {
  const reminder = petStore.reminders.find((r) => r._id === reminderId)
  if (!reminder) return
  const newNextDate = addDaysISO(reminder.next_date, extendDays)
  const db = await getDb()
  await db.collection(COLLECTIONS.REMINDERS).doc(reminderId).update({
    data: {
      next_date: newNextDate
    }
  })
  await loadReminders()
}

export async function removeReminder(reminderId) {
  const db = await getDb()
  await db.collection(COLLECTIONS.REMINDERS).doc(reminderId).remove()
  await loadReminders()
}

export async function addMedication(payload) {
  const db = await getDb()
  await db.collection(COLLECTIONS.MEDICATIONS).add({
    data: {
      pet_id: petStore.currentPetId,
      title: payload.title,
      start_date: payload.start_date,
      end_date: payload.end_date,
      plan_list: payload.plan_list,
      status: 'ongoing',
      create_time: Date.now()
    }
  })
  await loadMedications()
}

export async function removeMedication(medId) {
  const db = await getDb()
  await db.collection(COLLECTIONS.MEDICATIONS).doc(medId).remove()
  await loadMedications()
}

export async function loadAllMedicationsForPet() {
  if (!petStore.currentPetId) return []
  try {
    const db = await getDb()
    return await cloudGet(
      db.collection(COLLECTIONS.MEDICATIONS).where({ pet_id: petStore.currentPetId }).get(),
      { label: 'pet_medications', sort: sortBy('create_time', 'desc') }
    )
  } catch (err) {
    console.error('[cloud] loadAllMedications failed', err)
    return []
  }
}

export function mapPetForList(p) {
  return {
    _id: p._id,
    emoji: petEmoji(p.type),
    name: p.name,
    typeLabel: typeLabel(p.type),
    genderLabel: genderLabel(p.gender),
    birthday: p.birthday,
    breed: p.breed || ''
  }
}
