import type { WorkoutTemplate, WorkoutPlan, MuscleGroupId } from '@/types'

export const VALENTIN_PLAN_ID = 'valentin-5x5'

const workoutA: WorkoutTemplate = {
  id: 'valentin-a',
  name: 'Тренировка A',
  exercises: [
    { id: 'prised-shtanga', name: 'Присед со штангой', sets: 5, reps: 5 },
    { id: 'rumynskaya', name: 'Румынская тяга', sets: 5, reps: 5 },
    { id: 'zhim-lezha', name: 'Жим лёжа', sets: 5, reps: 5 },
    { id: 'tyaga-vert-blok', name: 'Тяга вертикального блока', sets: 5, reps: 5 },
    { id: 'zhim-stoya', name: 'Жим стоя', sets: 5, reps: 5 },
    { id: 'planka', name: 'Планка', sets: 2, reps: 0, durationSec: 45, bodyweight: true },
  ],
}

const workoutB: WorkoutTemplate = {
  id: 'valentin-b',
  name: 'Тренировка B',
  exercises: [
    { id: 'prised-front', name: 'Присед фронтальный', sets: 5, reps: 5 },
    { id: 'tyaga-vert-blok', name: 'Тяга вертикального блока', sets: 5, reps: 5 },
    { id: 'zhim-naklon', name: 'Жим на наклонной скамье', sets: 5, reps: 5 },
    { id: 'tyaga-goriz', name: 'Тяга штанги в наклоне', sets: 5, reps: 5 },
    { id: 'podem-nog', name: 'Подъём ног в висе / скручивания', sets: 2, reps: 12, bodyweight: true },
  ],
}

const workoutC: WorkoutTemplate = {
  id: 'valentin-c',
  name: 'Тренировка C',
  exercises: [
    { id: 'prised-shtanga', name: 'Присед со штангой', sets: 5, reps: 5 },
    { id: 'rumynskaya', name: 'Румынская тяга', sets: 5, reps: 5 },
    { id: 'zhim-lezha', name: 'Жим лёжа', sets: 5, reps: 5 },
    { id: 'tyaga-goriz', name: 'Тяга штанги в наклоне', sets: 5, reps: 5 },
    { id: 'zhim-stoya', name: 'Жим стоя', sets: 5, reps: 5 },
    { id: 'skruchivaniya', name: 'Скручивания / велосипед', sets: 2, reps: 15, bodyweight: true },
  ],
}

export const valentinPlan: WorkoutPlan = {
  id: VALENTIN_PLAN_ID,
  name: 'Men 5x5 Workout',
  workouts: [workoutA, workoutB, workoutC],
}

/** Расписание: Пн=A, Ср=B, Пт=C */
export const VALENTIN_SCHEDULE: Record<1 | 3 | 5, string> = {
  1: 'valentin-a',
  3: 'valentin-b',
  5: 'valentin-c',
}

export function getValentinAllExerciseIds(): string[] {
  const set = new Set<string>()
  for (const w of valentinPlan.workouts) {
    for (const e of w.exercises) {
      if (e.reps > 0 && !e.bodyweight) set.add(e.id)
    }
  }
  return Array.from(set)
}

/** Группы мышц по упражнению (для Валентина) */
const EXERCISE_MUSCLE_GROUPS: Record<string, MuscleGroupId[]> = {
  'prised-shtanga': ['legs'],
  'prised-front': ['legs'],
  rumynskaya: ['legs', 'back'],
  'zhim-lezha': ['chest', 'arms'],
  'tyaga-vert-blok': ['back', 'arms'],
  'zhim-stoya': ['shoulders', 'arms'],
  planka: ['core'],
  'zhim-naklon': ['chest', 'arms'],
  'tyaga-goriz': ['back', 'arms'],
  'podem-nog': ['core'],
  skruchivaniya: ['core'],
}

export function getValentinMuscleGroupsForExercise(exerciseId: string): MuscleGroupId[] {
  return EXERCISE_MUSCLE_GROUPS[exerciseId] ?? []
}
