import { getWorkoutById } from '@/data/helenPlan'
import type { WorkoutHistoryEntry, BodyMeasurementEntry, BodyMeasurementKey } from '@/types'

/** Стартовые веса по упражнениям (кг), затем лёгкая прогрессия по неделям */
const BASE_WEIGHTS: Record<string, number> = {
  'prised-smit': 40,
  rumynskaya: 20,
  'zhim-lezha': 25,
  'tyaga-vert': 30,
  'zhim-stoya': 20,
  planka: 0,
  'zhim-nogami': 60,
  podtyagivaniya: 25,
  'zhim-naklon': 12,
  'tyaga-goriz': 25,
  'podem-nog': 0,
  'prised-rahma': 35,
  skruchivaniya: 0,
}

/** Прирост веса раз в 2 недели для силовых (кг) */
const WEIGHT_INCREMENT: Record<string, number> = {
  'prised-smit': 2.5,
  rumynskaya: 1,
  'zhim-lezha': 2.5,
  'tyaga-vert': 2.5,
  'zhim-stoya': 2.5,
  'zhim-nogami': 5,
  podtyagivaniya: 2.5,
  'zhim-naklon': 1,
  'tyaga-goriz': 2.5,
  'prised-rahma': 2.5,
}

const SCHEDULE: Record<number, string> = {
  1: 'helen-a',
  3: 'helen-b',
  5: 'helen-c',
}

function getDayOfWeek(date: Date): number {
  const d = date.getDay()
  return d === 0 ? 7 : d
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Неделя от "начала" (0 = самая старая в диапазоне) */
function weekIndex(date: Date, start: Date): number {
  const ms = date.getTime() - start.getTime()
  return Math.floor(ms / (7 * 24 * 60 * 60 * 1000))
}

/**
 * Генерирует историю тренировок за последние ~2 месяца по расписанию Пн/Ср/Пт.
 */
export function seedWorkoutHistory(): WorkoutHistoryEntry[] {
  const entries: WorkoutHistoryEntry[] = []
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setDate(start.getDate() - 60)

  const startWeek = weekIndex(start, start)

  for (let i = 0; i < 61; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    if (d > end) break
    const dow = getDayOfWeek(d)
    const workoutId = SCHEDULE[dow]
    if (!workoutId) continue

    const workout = getWorkoutById(workoutId)
    if (!workout) continue

    const w = weekIndex(d, start) - startWeek
    const weights: Record<string, number> = {}
    for (const [exId, base] of Object.entries(BASE_WEIGHTS)) {
      const inc = WEIGHT_INCREMENT[exId] ?? 0
      const steps = Math.floor(w / 2)
      weights[exId] = Math.round((base + steps * inc) * 2) / 2
    }

    const exercises = workout.exercises.map((ex) => {
      const weight = weights[ex.id] ?? 0
      const sets = Array.from({ length: ex.sets }, () => ({
        weightKg: weight,
        reps: ex.reps,
        skipped: Math.random() < 0.05,
      }))
      return {
        id: ex.id,
        name: ex.name,
        sets,
      }
    })

    entries.push({
      date: toDateStr(d),
      workoutId,
      workoutName: workout.name,
      exercises,
    })
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date))
}

/** Базовые значения замеров (см, вес в кг), от которых идёт лёгкая динамика */
const MEASUREMENT_BASE: Record<BodyMeasurementKey, number> = {
  weight: 66,
  chest: 92,
  waist: 72,
  hips: 98,
  bicep: 28,
  thigh: 54,
}

/** Небольшая случайная вариация ±n для реалистичности */
function vary(value: number, range: number): number {
  return Math.round((value + (Math.random() - 0.5) * 2 * range) * 10) / 10
}

function toDateStrForMeasurements(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Генерирует историю замеров за последние ~10 недель (1–2 замера в неделю).
 * Вес и талия слегка снижаются, остальное с небольшой вариацией.
 */
export function seedBodyMeasurements(): BodyMeasurementEntry[] {
  const entries: BodyMeasurementEntry[] = []
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setDate(start.getDate() - 70)

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay()
    // Замеры примерно 1–2 раза в неделю (например, понедельник и четверг)
    if (dayOfWeek !== 1 && dayOfWeek !== 4) continue
    if (Math.random() > 0.85) continue

    const weeksFromStart = (d.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)
    const progress = Math.min(weeksFromStart / 10, 1)

    const weightTrend = MEASUREMENT_BASE.weight - progress * 2
    const waistTrend = MEASUREMENT_BASE.waist - progress * 2.5

    entries.push({
      date: toDateStrForMeasurements(d),
      values: {
        weight: vary(weightTrend, 0.8),
        chest: vary(MEASUREMENT_BASE.chest, 1),
        waist: vary(waistTrend, 1),
        hips: vary(MEASUREMENT_BASE.hips, 1.5),
        bicep: vary(MEASUREMENT_BASE.bicep, 0.5),
        thigh: vary(MEASUREMENT_BASE.thigh, 1),
      },
    })
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date))
}
