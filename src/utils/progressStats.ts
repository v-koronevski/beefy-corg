import { getWorkoutHistory, getSchedule, getNextWeights } from '@/utils/storage'
import { MUSCLE_GROUP_NAMES } from '@/data/helenPlan'
import { getExerciseNameByIdFromPlan, getMuscleGroupsForExerciseFromPlan } from '@/data/plans'
import type { MuscleGroupId } from '@/types'

/** Оценка 1RM по формуле Эпли: 1RM ≈ вес × (1 + reps/30). Для reps < 1 возвращаем вес. */
export function estimate1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0) return 0
  if (reps <= 0) return weightKg
  if (reps === 1) return weightKg
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10
}

export interface ExerciseStrengthStats {
  exerciseId: string
  exerciseName: string
  muscleGroups: MuscleGroupId[]
  /** Рабочий вес (кг) — из плана на следующую тренировку или последний в истории */
  workingWeightKg: number
  /** Оценка 1RM (кг) по истории — максимум по всем подходам */
  estimated1RM: number
}

/** Статистика по силе: рабочий вес и оценка 1RM по каждому упражнению */
export function getExerciseStrengthStats(): ExerciseStrengthStats[] {
  const history = getWorkoutHistory()
  const planId = getSchedule()?.planId ?? ''
  const nextWeights = getNextWeights(planId)

  const max1RMByEx = new Map<string, number>()
  const lastWeightByEx = new Map<string, number>()

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))
  for (const entry of sorted) {
    for (const ex of entry.exercises) {
      let workoutMaxWeight = 0
      for (const set of ex.sets) {
        if (set.skipped) continue
        const w = set.weightKg
        const r = set.reps ?? 0
        if (w > 0 && r > 0) {
          workoutMaxWeight = Math.max(workoutMaxWeight, w)
          const oneRM = estimate1RM(w, r)
          const prev = max1RMByEx.get(ex.id) ?? 0
          max1RMByEx.set(ex.id, Math.max(prev, oneRM))
        }
      }
      if (workoutMaxWeight > 0) {
        lastWeightByEx.set(ex.id, workoutMaxWeight)
      }
    }
  }

  const exerciseIds = new Set<string>([
    ...max1RMByEx.keys(),
    ...lastWeightByEx.keys(),
    ...Object.keys(nextWeights),
  ])

  const result: ExerciseStrengthStats[] = []
  for (const exerciseId of exerciseIds) {
    const workingWeightKg = nextWeights[exerciseId] ?? lastWeightByEx.get(exerciseId) ?? 0
    const estimated1RM = max1RMByEx.get(exerciseId) ?? 0
    if (workingWeightKg <= 0 && estimated1RM <= 0) continue
    result.push({
      exerciseId,
      exerciseName: getExerciseNameByIdFromPlan(planId, exerciseId),
      muscleGroups: getMuscleGroupsForExerciseFromPlan(planId, exerciseId),
      workingWeightKg,
      estimated1RM,
    })
  }

  return result.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName))
}

/** Объём за подход: вес × повторения (пропущенные не считаем) */
function volumeFromSets(
  sets: { weightKg: number; reps: number; skipped?: boolean }[]
): number {
  return sets.reduce(
    (sum, s) => sum + (s.skipped ? 0 : s.weightKg * s.reps),
    0
  )
}

/** Понедельник недели для даты (YYYY-MM-DD) */
function weekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export interface DayAggregate {
  date: string
  byExercise: Record<string, number>
  byMuscleGroup: Record<MuscleGroupId, number>
  /** Макс. рабочий вес в этот день по упражнению (кг) */
  byExerciseWeight: Record<string, number>
  /** Макс. оценка 1RM за подходы в этот день по упражнению */
  byExerciseDay1RM: Record<string, number>
}

export interface WeekAggregate {
  weekStart: string
  byExercise: Record<string, number>
  byMuscleGroup: Record<MuscleGroupId, number>
  byExerciseWeight: Record<string, number>
  byExerciseDay1RM: Record<string, number>
}

export function getHistoryByDay(): DayAggregate[] {
  const history = getWorkoutHistory()
  const planId = getSchedule()?.planId ?? ''
  const map = new Map<string, {
    byExercise: Record<string, number>
    byMuscleGroup: Record<MuscleGroupId, number>
    byExerciseWeight: Record<string, number>
    byExerciseDay1RM: Record<string, number>
  }>()

  const emptyGroups = (): Record<MuscleGroupId, number> =>
    ({ legs: 0, back: 0, chest: 0, shoulders: 0, arms: 0, core: 0 })

  for (const entry of history) {
    const byExercise: Record<string, number> = {}
    const byMuscleGroup = emptyGroups()
    const byExerciseWeight: Record<string, number> = {}
    const byExerciseDay1RM: Record<string, number> = {}

    for (const ex of entry.exercises) {
      const vol = volumeFromSets(ex.sets)
      let maxW = 0
      let max1RM = 0
      for (const set of ex.sets) {
        if (set.skipped) continue
        const w = set.weightKg
        const r = set.reps ?? 0
        if (w > 0) {
          maxW = Math.max(maxW, w)
          if (r > 0) max1RM = Math.max(max1RM, estimate1RM(w, r))
        }
      }
      if (vol > 0) {
        byExercise[ex.id] = (byExercise[ex.id] ?? 0) + vol
        for (const g of getMuscleGroupsForExerciseFromPlan(planId, ex.id)) {
          byMuscleGroup[g] = (byMuscleGroup[g] ?? 0) + vol
        }
      }
      if (maxW > 0) byExerciseWeight[ex.id] = Math.max(byExerciseWeight[ex.id] ?? 0, maxW)
      if (max1RM > 0) byExerciseDay1RM[ex.id] = Math.max(byExerciseDay1RM[ex.id] ?? 0, max1RM)
    }

    const existing = map.get(entry.date)
    if (existing) {
      for (const [id, v] of Object.entries(byExercise)) {
        existing.byExercise[id] = (existing.byExercise[id] ?? 0) + v
      }
      for (const g of Object.keys(byMuscleGroup) as MuscleGroupId[]) {
        existing.byMuscleGroup[g] = (existing.byMuscleGroup[g] ?? 0) + byMuscleGroup[g]
      }
      for (const [id, v] of Object.entries(byExerciseWeight)) {
        existing.byExerciseWeight[id] = Math.max(existing.byExerciseWeight[id] ?? 0, v)
      }
      for (const [id, v] of Object.entries(byExerciseDay1RM)) {
        existing.byExerciseDay1RM[id] = Math.max(existing.byExerciseDay1RM[id] ?? 0, v)
      }
    } else {
      map.set(entry.date, {
        byExercise,
        byMuscleGroup,
        byExerciseWeight,
        byExerciseDay1RM,
      })
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, agg]) => ({ date, ...agg }))
}

export function getHistoryByWeek(): WeekAggregate[] {
  const byDay = getHistoryByDay()
  const map = new Map<string, {
    byExercise: Record<string, number>
    byMuscleGroup: Record<MuscleGroupId, number>
    byExerciseWeight: Record<string, number>
    byExerciseDay1RM: Record<string, number>
  }>()

  for (const day of byDay) {
    const w = weekKey(day.date)
    const existing = map.get(w)
    if (existing) {
      for (const [id, v] of Object.entries(day.byExercise)) {
        existing.byExercise[id] = (existing.byExercise[id] ?? 0) + v
      }
      for (const g of Object.keys(day.byMuscleGroup) as MuscleGroupId[]) {
        existing.byMuscleGroup[g] = (existing.byMuscleGroup[g] ?? 0) + day.byMuscleGroup[g]
      }
      for (const [id, v] of Object.entries(day.byExerciseWeight)) {
        existing.byExerciseWeight[id] = Math.max(existing.byExerciseWeight[id] ?? 0, v)
      }
      for (const [id, v] of Object.entries(day.byExerciseDay1RM)) {
        existing.byExerciseDay1RM[id] = Math.max(existing.byExerciseDay1RM[id] ?? 0, v)
      }
    } else {
      map.set(w, {
        byExercise: { ...day.byExercise },
        byMuscleGroup: { ...day.byMuscleGroup },
        byExerciseWeight: { ...day.byExerciseWeight },
        byExerciseDay1RM: { ...day.byExerciseDay1RM },
      })
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, agg]) => ({ weekStart, ...agg }))
}

export { MUSCLE_GROUP_NAMES }
