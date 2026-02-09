import type { ExerciseInWorkout, WorkoutTemplate, WorkoutPlan, MuscleGroupId, ExerciseSettings } from '@/types'
import { getExerciseSettings, getExerciseSetting } from '@/utils/storage'

export const HELEN_PLAN_ID = 'helen-fullbody'

const workoutA: WorkoutTemplate = {
  id: 'helen-a',
  name: 'Тренировка A',
  exercises: [
    { id: 'prised-smit', name: 'Присед (Смит)', sets: 5, reps: 5 },
    { id: 'yagodichnyj-most', name: 'Ягодичный мост (с отягощением)', sets: 5, reps: 5 },
    { id: 'zhim-lezha', name: 'Жим лёжа', sets: 3, reps: 5 },
    { id: 'tyaga-vert', name: 'Тяга вертикальная (к груди)', sets: 3, reps: 5 },
    { id: 'zhim-stoya', name: 'Жим стоя', sets: 2, reps: 5 },
    { id: 'planka', name: 'Планка', sets: 2, reps: 0, durationSec: 45, bodyweight: true },
  ],
}

const workoutB: WorkoutTemplate = {
  id: 'helen-b',
  name: 'Тренировка B',
  exercises: [
    { id: 'zhim-nogami', name: 'Жим ногами', sets: 5, reps: 5 },
    { id: 'giperekstenziya', name: 'Гиперэкстензия', sets: 2, reps: 12 },
    { id: 'podtyagivaniya', name: 'Подтягивания / тяга к груди', sets: 3, reps: 5 },
    { id: 'zhim-naklon', name: 'Жим на наклонной скамье', sets: 3, reps: 5 },
    { id: 'tyaga-goriz', name: 'Тяга горизонтальная (к поясу)', sets: 3, reps: 5 },
    { id: 'podem-nog', name: 'Подъём ног в висе / лёжа', sets: 2, reps: 12, bodyweight: true },
  ],
}

const workoutC: WorkoutTemplate = {
  id: 'helen-c',
  name: 'Тренировка C',
  exercises: [
    { id: 'prised-rahma', name: 'Присед со штангой (рама)', sets: 5, reps: 5 },
    { id: 'rumynskaya', name: 'Румынская тяга', sets: 5, reps: 5 },
    { id: 'zhim-lezha', name: 'Жим лёжа', sets: 3, reps: 5 },
    { id: 'tyaga-goriz', name: 'Тяга горизонтальная (к поясу)', sets: 3, reps: 5 },
    { id: 'zhim-stoya', name: 'Жим стоя', sets: 3, reps: 5 },
    { id: 'skruchivaniya', name: 'Скручивания / велосипед', sets: 2, reps: 15, bodyweight: true },
  ],
}

export const helenPlan: WorkoutPlan = {
  id: HELEN_PLAN_ID,
  name: 'Full-Body 5×5',
  workouts: [workoutA, workoutB, workoutC],
}

/** Расписание: Пн=A, Ср=B, Пт=C */
export const HELEN_SCHEDULE: Record<1 | 3 | 5, string> = {
  1: 'helen-a',
  3: 'helen-b',
  5: 'helen-c',
}

/** Id упражнений с собственным весом (для buildWorkoutWithWeights, если в шаблоне не задан bodyweight) */
const BODYWEIGHT_EXERCISE_IDS = new Set(['planka', 'podem-nog', 'skruchivaniya'])

/** Все уникальные id упражнений для ввода стартовых весов (без упражнений с собственным весом) */
export function getHelenAllExerciseIds(): string[] {
  const set = new Set<string>()
  for (const w of helenPlan.workouts) {
    for (const e of w.exercises) {
      if (e.reps > 0 && !e.bodyweight) set.add(e.id)
    }
  }
  return Array.from(set)
}

export function getWorkoutById(workoutId: string): WorkoutTemplate | undefined {
  return helenPlan.workouts.find((w) => w.id === workoutId)
}

/** Создать из шаблона тренировку с весами (для отображения и старта) */
export function buildWorkoutWithWeights(
  workout: WorkoutTemplate,
  weights: Record<string, number>
): ExerciseInWorkout[] {
  // Загружаем настройки упражнений
  let exerciseSettings: Record<string, ExerciseSettings> = {}
  try {
    exerciseSettings = getExerciseSettings()
  } catch {
    // Если не удалось загрузить настройки, используем значения по умолчанию
  }
  
  return workout.exercises.map((ex) => {
    const settings = exerciseSettings[ex.id]
    const sets = settings?.sets ?? ex.sets
    const reps = settings?.reps ?? ex.reps
    const durationSec = settings?.durationSec ?? ex.durationSec
    
    return {
      id: ex.id,
      name: ex.name,
      durationSec,
      bodyweight: ex.bodyweight ?? BODYWEIGHT_EXERCISE_IDS.has(ex.id),
      sets: Array.from({ length: sets }, () => ({
        weightKg: weights[ex.id] ?? 0,
        reps,
      })),
    }
  })
}

/** Шаг добавления веса: гантели +1 кг, остальное +2.5 кг */
const ADD_STEP_KG: Record<string, number> = {
  rumynskaya: 1,
  'yagodichnyj-most': 2.5,
  'zhim-naklon': 1,
  giperekstenziya: 2.5,
}
const DEFAULT_ADD_KG = 2.5
const DELOAD_FACTOR = 0.9

export function getNextWeightKg(
  choice: 'deload' | 'same' | 'add',
  currentKg: number,
  exerciseId: string
): number {
  if (choice === 'same') return currentKg
  
  // Загружаем настройки упражнения
  let addStep = ADD_STEP_KG[exerciseId] ?? DEFAULT_ADD_KG
  let deloadStep: number | null = null
  
  try {
    const settings = getExerciseSetting(exerciseId)
    if (settings) {
      if (settings.addStepKg !== undefined) addStep = settings.addStepKg
      if (settings.deloadStepKg !== undefined) deloadStep = settings.deloadStepKg
    }
  } catch {
    // Если не удалось загрузить настройки, используем значения по умолчанию
  }
  
  if (choice === 'deload') {
    if (deloadStep !== null) {
      return Math.max(0, Math.round((currentKg - deloadStep) * 2) / 2)
    }
    return Math.max(0, Math.round(currentKg * DELOAD_FACTOR * 2) / 2)
  }
  
  return Math.round((currentKg + addStep) * 2) / 2
}

/** Группы мышц по упражнению (объём считается в каждую из групп) */
const EXERCISE_MUSCLE_GROUPS: Record<string, MuscleGroupId[]> = {
  'prised-smit': ['legs'],
  'yagodichnyj-most': ['legs'],
  'zhim-lezha': ['chest', 'arms'],
  'tyaga-vert': ['back', 'arms'],
  'zhim-stoya': ['shoulders', 'arms'],
  planka: ['core'],
  'zhim-nogami': ['legs'],
  giperekstenziya: ['back', 'legs'],
  podtyagivaniya: ['back', 'arms'],
  'zhim-naklon': ['chest', 'arms'],
  'tyaga-goriz': ['back', 'arms'],
  'podem-nog': ['core'],
  'prised-rahma': ['legs'],
  rumynskaya: ['legs', 'back'],
  skruchivaniya: ['core'],
}

export function getMuscleGroupsForExercise(exerciseId: string): MuscleGroupId[] {
  return EXERCISE_MUSCLE_GROUPS[exerciseId] ?? []
}

export const MUSCLE_GROUP_NAMES: Record<MuscleGroupId, string> = {
  legs: 'Ноги',
  back: 'Спина',
  chest: 'Грудь',
  shoulders: 'Плечи',
  arms: 'Руки',
  core: 'Пресс/кора',
}

export function getExerciseNameById(exerciseId: string): string {
  for (const w of helenPlan.workouts) {
    const ex = w.exercises.find((e) => e.id === exerciseId)
    if (ex) return ex.name
  }
  return exerciseId
}
