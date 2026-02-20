/** Один подход: вес (кг), повторения, опционально пропущен */
export interface WorkSet {
  weightKg: number
  reps: number
  skipped?: boolean
  durationSec?: number
  isWarmup?: boolean
}

/** Упражнение в шаблоне тренировки */
export interface ExerciseTemplate {
  id: string
  name: string
  sets: number
  reps: number
  /** Для планки/пресса: время в секундах вместо reps */
  durationSec?: number
  /** Упражнение с собственным весом — не настраивать вес в онбординге и на экране завершения */
  bodyweight?: boolean
}

/** Упражнение в конкретной тренировке (с весами из плана) */
export interface ExerciseInWorkout {
  id: string
  name: string
  sets: WorkSet[]
  /** Для пресса: время в сек */
  durationSec?: number
  /** Упражнение с собственным весом — не показывать выбор веса на следующую тренировку */
  bodyweight?: boolean
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
    notes?: string
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

/** Ключи замеров тела: объёмы в см, вес в кг */
export type BodyMeasurementKey =
  | 'weight'    // вес тела, кг
  | 'chest'     // грудь, см
  | 'waist'     // талия, см
  | 'hips'      // бёдра, см
  | 'bicep'     // бицепс, см
  | 'thigh'     // бедро, см

/** Одна запись замеров на дату */
export interface BodyMeasurementEntry {
  date: string // YYYY-MM-DD
  values: Partial<Record<BodyMeasurementKey, number>> // вес в кг, остальное в см
}

/** Уровень активности для расчёта суточной нормы калорий (TDEE) */
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'extra'

/** Цель по питанию: калории и БЖУ подстраиваются под цель */
export type NutritionGoal = 'loss' | 'maintain' | 'gain'

/** Профиль для расчёта калорий: рост, возраст (через год рождения), пол, активность, цель */
export interface CalorieProfile {
  heightCm: number
  birthYear: number
  sex: 'male' | 'female'
  activityLevel: ActivityLevel
  /** Цель: похудение, поддержание, набор массы */
  goal?: NutritionGoal
}

/** Настройки упражнения: шаг изменения веса, подходы, повторения */
export interface ExerciseSettings {
  /** Шаг увеличения веса при выборе "добавить" (кг) */
  addStepKg?: number
  /** Шаг уменьшения веса при выборе "понизить" (кг), если не задан - используется 10% */
  deloadStepKg?: number
  /** Количество подходов (переопределяет значение из плана) */
  sets?: number
  /** Количество повторений (переопределяет значение из плана) */
  reps?: number
  /** Время в секундах для упражнений на время (переопределяет значение из плана) */
  durationSec?: number
}
