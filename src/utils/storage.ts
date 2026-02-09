import type { WorkoutPlan, WorkoutSchedule, ScheduleDay, WorkoutHistoryEntry, BodyMeasurementEntry, ExerciseSettings } from '@/types'

const KEY_PLANS = 'workout_plans'
const KEY_SCHEDULE = 'workout_schedule'
const KEY_WEIGHTS = 'helen_next_weights'
const KEY_NEXT_WEIGHTS_BY_PLAN = 'workout_next_weights_by_plan'
const KEY_ONBOARDING = 'onboarding_completed'
const KEY_HISTORY = 'workout_history'
const KEY_MEASUREMENTS = 'body_measurements'
const KEY_THEME = 'app_theme'
const KEY_EXERCISE_SETTINGS = 'exercise_settings'
const KEY_DATA_VERSION = 'data_version'

// Версия схемы данных (увеличиваем при изменениях структуры)
const CURRENT_DATA_VERSION = 2

export type ThemeId = 'light' | 'dark' | 'system'

export function getTheme(): ThemeId {
  const v = localStorage.getItem(KEY_THEME)
  if (v === 'light' || v === 'dark' || v === 'system') return v
  return 'system'
}

export function setTheme(theme: ThemeId): void {
  localStorage.setItem(KEY_THEME, theme)
}

export function getEffectiveDark(): boolean {
  const theme = getTheme()
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function getPlans(): WorkoutPlan[] {
  try {
    const raw = localStorage.getItem(KEY_PLANS)
    if (!raw) return []
    return JSON.parse(raw) as WorkoutPlan[]
  } catch {
    return []
  }
}

export function setPlans(plans: WorkoutPlan[]): void {
  localStorage.setItem(KEY_PLANS, JSON.stringify(plans))
}

export function getSchedule(): WorkoutSchedule | null {
  try {
    const raw = localStorage.getItem(KEY_SCHEDULE)
    if (!raw) return null
    return JSON.parse(raw) as WorkoutSchedule
  } catch {
    return null
  }
}

export function setSchedule(schedule: WorkoutSchedule): void {
  localStorage.setItem(KEY_SCHEDULE, JSON.stringify(schedule))
}

/** Веса по плану (для текущего расписания). Поддерживает миграцию со старого ключа Helen. */
export function getNextWeights(planId: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY_NEXT_WEIGHTS_BY_PLAN)
    if (raw) {
      const obj = JSON.parse(raw) as Record<string, Record<string, number>>
      if (obj[planId]) return obj[planId]
    }
  } catch {
    // ignore
  }
  if (planId === 'helen-fullbody') {
    try {
      const raw = localStorage.getItem(KEY_WEIGHTS)
      if (raw) return JSON.parse(raw) as Record<string, number>
    } catch {
      // ignore
    }
  }
  return {}
}

export function setNextWeights(planId: string, weights: Record<string, number>): void {
  try {
    const raw = localStorage.getItem(KEY_NEXT_WEIGHTS_BY_PLAN)
    const obj = raw ? (JSON.parse(raw) as Record<string, Record<string, number>>) : {}
    obj[planId] = weights
    localStorage.setItem(KEY_NEXT_WEIGHTS_BY_PLAN, JSON.stringify(obj))
  } catch {
    localStorage.setItem(KEY_NEXT_WEIGHTS_BY_PLAN, JSON.stringify({ [planId]: weights }))
  }
}

export function getHelenNextWeights(): Record<string, number> {
  return getNextWeights('helen-fullbody')
}

export function setHelenNextWeights(weights: Record<string, number>): void {
  setNextWeights('helen-fullbody', weights)
}

export function isOnboardingCompleted(): boolean {
  return localStorage.getItem(KEY_ONBOARDING) === 'true'
}

export function setOnboardingCompleted(): void {
  localStorage.setItem(KEY_ONBOARDING, 'true')
}

export function getWorkoutHistory(): WorkoutHistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY_HISTORY)
    if (!raw) return []
    return JSON.parse(raw) as WorkoutHistoryEntry[]
  } catch {
    return []
  }
}

export function addWorkoutHistoryEntry(entry: WorkoutHistoryEntry): void {
  const list = getWorkoutHistory()
  list.push(entry)
  localStorage.setItem(KEY_HISTORY, JSON.stringify(list))
}

export function setWorkoutHistory(entries: WorkoutHistoryEntry[]): void {
  localStorage.setItem(KEY_HISTORY, JSON.stringify(entries))
}

export function getBodyMeasurements(): BodyMeasurementEntry[] {
  try {
    const raw = localStorage.getItem(KEY_MEASUREMENTS)
    if (!raw) return []
    return JSON.parse(raw) as BodyMeasurementEntry[]
  } catch {
    return []
  }
}

export function addBodyMeasurement(entry: BodyMeasurementEntry): void {
  const list = getBodyMeasurements()
  const existing = list.findIndex((e) => e.date === entry.date)
  if (existing >= 0) {
    const prev = list[existing]!
    list[existing] = {
      date: prev.date,
      values: { ...prev.values, ...entry.values },
    }
  } else {
    list.push(entry)
    list.sort((a, b) => a.date.localeCompare(b.date))
  }
  localStorage.setItem(KEY_MEASUREMENTS, JSON.stringify(list))
}

export function setBodyMeasurements(entries: BodyMeasurementEntry[]): void {
  localStorage.setItem(KEY_MEASUREMENTS, JSON.stringify(entries))
}

/** Сброс только программы: планы, расписание, веса, онбординг, настройки упражнений. История и замеры сохраняются. */
export function resetProgram(): void {
  localStorage.removeItem(KEY_PLANS)
  localStorage.removeItem(KEY_SCHEDULE)
  localStorage.removeItem(KEY_WEIGHTS)
  localStorage.removeItem(KEY_NEXT_WEIGHTS_BY_PLAN)
  localStorage.removeItem(KEY_ONBOARDING)
  localStorage.removeItem(KEY_EXERCISE_SETTINGS)
}

/** Сброс всех данных приложения: планы, расписание, веса, онбординг, история, замеры. Тема сохраняется. */
export function resetAppData(): void {
  resetProgram()
  localStorage.removeItem(KEY_HISTORY)
  localStorage.removeItem(KEY_MEASUREMENTS)
}

/** Локальная дата сегодня в формате YYYY-MM-DD */
export function getTodayDateString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Дата в локальной таймзоне в формате YYYY-MM-DD */
export function dateToLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Была ли тренировка workoutId пройдена в указанный день (dateStr YYYY-MM-DD) */
export function wasWorkoutCompletedOnDate(dateStr: string, workoutId: string): boolean {
  const history = getWorkoutHistory()
  return history.some((e) => e.date === dateStr && e.workoutId === workoutId)
}

/** День недели 1–7 (1 = понедельник) для данной даты */
export function getDayOfWeek(date: Date): number {
  const d = date.getDay()
  return d === 0 ? 7 : d
}

/** Следующие N дат по расписанию (Пн/Ср/Пт), начиная с сегодня или позже */
export function getUpcomingScheduleDates(
  _schedule: WorkoutSchedule,
  count: number
): { date: Date; dayOfWeek: ScheduleDay }[] {
  const days: ScheduleDay[] = [1, 3, 5]
  const result: { date: Date; dayOfWeek: ScheduleDay }[] = []
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  for (let offset = 0; result.length < count; offset++) {
    const d = new Date(start)
    d.setDate(d.getDate() + offset)
    const dow = getDayOfWeek(d) as number
    if (days.includes(dow as ScheduleDay)) {
      result.push({ date: d, dayOfWeek: dow as ScheduleDay })
    }
  }
  return result
}

/** Настройки упражнений: exerciseId → ExerciseSettings */
export function getExerciseSettings(): Record<string, ExerciseSettings> {
  try {
    const raw = localStorage.getItem(KEY_EXERCISE_SETTINGS)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, ExerciseSettings>
  } catch {
    return {}
  }
}

export function setExerciseSettings(settings: Record<string, ExerciseSettings>): void {
  localStorage.setItem(KEY_EXERCISE_SETTINGS, JSON.stringify(settings))
}

export function getExerciseSetting(exerciseId: string): ExerciseSettings | null {
  const all = getExerciseSettings()
  return all[exerciseId] || null
}

export function setExerciseSetting(exerciseId: string, setting: ExerciseSettings | null): void {
  const all = getExerciseSettings()
  if (setting === null) {
    delete all[exerciseId]
  } else {
    all[exerciseId] = setting
  }
  setExerciseSettings(all)
}

/** Получить текущую версию данных */
function getDataVersion(): number {
  try {
    const v = localStorage.getItem(KEY_DATA_VERSION)
    return v ? parseInt(v, 10) : 1
  } catch {
    return 1
  }
}

/** Установить версию данных */
function setDataVersion(version: number): void {
  localStorage.setItem(KEY_DATA_VERSION, String(version))
}

/**
 * Миграция данных из старых версий в новую
 * Вызывается при загрузке приложения
 */
export function migrateDataIfNeeded(): void {
  const currentVersion = getDataVersion()
  
  if (currentVersion >= CURRENT_DATA_VERSION) {
    return // Данные уже актуальны
  }
  
  // Миграция с версии 1 на версию 2
  if (currentVersion < 2) {
    migrateHistoryNotesFromWorkoutToExercise()
    setDataVersion(2)
  }
}

/**
 * Миграция заметок из уровня тренировки в уровень упражнения
 * Старая структура: WorkoutHistoryEntry.notes
 * Новая структура: WorkoutHistoryEntry.exercises[].notes
 */
function migrateHistoryNotesFromWorkoutToExercise(): void {
  try {
    const raw = localStorage.getItem(KEY_HISTORY)
    if (!raw) return
    
    const history = JSON.parse(raw) as Array<{
      date: string
      workoutId: string
      workoutName: string
      exercises: Array<{
        id: string
        name: string
        sets: Array<{ weightKg: number; reps: number; skipped?: boolean; durationSec?: number }>
        notes?: string
      }>
      notes?: string // Старое поле на уровне тренировки
    }>
    
    let needsUpdate = false
    const migrated = history.map((entry) => {
      // Если есть старое поле notes на уровне тренировки и нет заметок в упражнениях
      if (entry.notes && !entry.exercises.some((ex) => ex.notes)) {
        needsUpdate = true
        // Распределяем заметку на первое упражнение (или можно на все, но логичнее на первое)
        const updatedExercises = entry.exercises.map((ex, idx) => ({
          ...ex,
          notes: idx === 0 ? entry.notes : ex.notes,
        }))
        // Удаляем старое поле notes
        const { notes, ...rest } = entry
        return {
          ...rest,
          exercises: updatedExercises,
        }
      }
      return entry
    })
    
    if (needsUpdate) {
      localStorage.setItem(KEY_HISTORY, JSON.stringify(migrated))
    }
  } catch {
    // Если миграция не удалась, продолжаем работу (старые данные останутся как есть)
  }
}
