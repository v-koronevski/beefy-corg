import type { WorkoutPlan, WorkoutTemplate, MuscleGroupId } from '@/types'
import { helenPlan, HELEN_PLAN_ID, getMuscleGroupsForExercise as getHelenMuscleGroups } from '@/data/helenPlan'
import { valentinPlan, VALENTIN_PLAN_ID, getValentinMuscleGroupsForExercise } from '@/data/valentinPlan'

const PLANS_BY_ID: Record<string, WorkoutPlan> = {
  [HELEN_PLAN_ID]: helenPlan,
  [VALENTIN_PLAN_ID]: valentinPlan,
}

export { helenPlan, valentinPlan, HELEN_PLAN_ID, VALENTIN_PLAN_ID }

export function getPlanById(planId: string): WorkoutPlan | undefined {
  return PLANS_BY_ID[planId]
}

export function getWorkoutByIdFromPlan(workoutId: string, plan: WorkoutPlan): WorkoutTemplate | undefined {
  return plan.workouts.find((w) => w.id === workoutId)
}

function findExerciseNameInPlan(plan: WorkoutPlan, exerciseId: string): string | null {
  for (const w of plan.workouts) {
    const ex = w.exercises.find((e) => e.id === exerciseId)
    if (ex) return ex.name
  }
  return null
}

/** Имя упражнения по плану; при отсутствии в текущем плане — поиск в остальных (для истории со сменой программы). */
export function getExerciseNameByIdFromPlan(planId: string, exerciseId: string): string {
  const plan = PLANS_BY_ID[planId]
  if (plan) {
    const name = findExerciseNameInPlan(plan, exerciseId)
    if (name) return name
  }
  for (const p of Object.values(PLANS_BY_ID)) {
    const name = findExerciseNameInPlan(p, exerciseId)
    if (name) return name
  }
  return exerciseId
}

export function getMuscleGroupsForExerciseFromPlan(planId: string, exerciseId: string): MuscleGroupId[] {
  if (planId === VALENTIN_PLAN_ID) return getValentinMuscleGroupsForExercise(exerciseId)
  return getHelenMuscleGroups(exerciseId)
}
