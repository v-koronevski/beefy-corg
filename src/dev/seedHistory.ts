import { getWorkoutById } from '@/data/helenPlan'
import type { WorkoutHistoryEntry } from '@/types'

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
