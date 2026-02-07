/** Один подход: вес (кг), повторения, опционально пропущен */
export interface WorkSet {
  weightKg: number
  reps: number
  skipped?: boolean
}

/** Упражнение в шаблоне тренировки */
export interface ExerciseTemplate {
  id: string
  name: string
  sets: number
  reps: number
  /** Для планки/пресса: время в секундах вместо reps */
  durationSec?: number
}

/** Упражнение в конкретной тренировке (с весами из плана) */
export interface ExerciseInWorkout {
  id: string
  name: string
  sets: WorkSet[]
  /** Для пресса: время в сек */
  durationSec?: number
}

/** Одна тренировка (A, B или C) */
export interface WorkoutTemplate {
  id: string
  name: string
  exercises: ExerciseTemplate[]
}

/** План: список тренировок A/B/C */
export interface WorkoutPlan {
  id: string
  name: string
  workouts: WorkoutTemplate[]
}

/** День недели по расписанию: 1=Пн, 3=Ср, 5=Пт */
export type ScheduleDay = 1 | 3 | 5

/** Расписание: какой день недели — какая тренировка (id шаблона) */
export interface WorkoutSchedule {
  planId: string
  /** понедельник=1, среда=3, пятница=5 → workoutId */
  byDay: Record<ScheduleDay, string>
}

/** Элемент «ближайшей» тренировки для отображения */
export interface UpcomingWorkoutItem {
  date: string
  dayName: string
  workoutId: string
  workoutName: string
  exercises: ExerciseInWorkout[]
}

/** Выбор веса на следующую тренировку (после завершения) */
export type NextWeightChoice = 'deload' | 'same' | 'add'

/** Выбор по упражнению для экрана завершения */
export interface ExerciseNextWeight {
  exerciseId: string
  exerciseName: string
  currentWeightKg: number
  choice: NextWeightChoice
  /** Итоговый вес после выбора (для отображения) */
  nextWeightKg: number
}

/** Запись в истории: одна завершённая тренировка */
export interface WorkoutHistoryEntry {
  date: string
  workoutId: string
  workoutName: string
  exercises: {
    id: string
    name: string
    sets: { weightKg: number; reps: number; skipped?: boolean; durationSec?: number }[]
  }[]
}

/** Группы мышц для агрегации объёма */
export type MuscleGroupId =
  | 'legs'
  | 'back'
  | 'chest'
  | 'shoulders'
  | 'arms'
  | 'core'
