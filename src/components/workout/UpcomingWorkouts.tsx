import { useMemo } from 'react'
import {
  getSchedule,
  getUpcomingScheduleDates,
  getNextWeights,
  getTodayDateString,
  wasWorkoutCompletedOnDate,
  dateToLocalDateString,
} from '@/utils/storage'
import { getPlanById, getWorkoutByIdFromPlan } from '@/data/plans'
import { buildWorkoutWithWeights } from '@/data/helenPlan'
import type { UpcomingWorkoutItem } from '@/types'

const DAY_NAMES: Record<number, string> = {
  1: 'Пн',
  3: 'Ср',
  5: 'Пт',
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  })
}

interface UpcomingWorkoutsProps {
  onStartWorkout: (item: UpcomingWorkoutItem) => void
}

export function UpcomingWorkouts({ onStartWorkout }: UpcomingWorkoutsProps) {
  const schedule = getSchedule()
  const planId = schedule?.planId
  const plan = planId ? getPlanById(planId) : null
  const weights = planId ? getNextWeights(planId) : {}

  const todayStr = getTodayDateString()

  const upcoming = useMemo((): (UpcomingWorkoutItem & { completed?: boolean })[] => {
    if (!schedule || !plan) return []
    const dates = getUpcomingScheduleDates(schedule, 6)
    return dates.map(({ date, dayOfWeek }) => {
      const workoutId = schedule.byDay[dayOfWeek]
      const workout = getWorkoutByIdFromPlan(workoutId, plan)
      if (!workout) return null
      const exercises = buildWorkoutWithWeights(workout, weights)
      const dateStr = dateToLocalDateString(date)
      const completed = dateStr === todayStr && wasWorkoutCompletedOnDate(dateStr, workoutId)
      return {
        date: dateStr,
        dayName: DAY_NAMES[dayOfWeek] ?? '',
        workoutId,
        workoutName: workout.name,
        exercises,
        completed,
      }
    }).filter(Boolean) as (UpcomingWorkoutItem & { completed?: boolean })[]
  }, [schedule, plan, weights, todayStr])

  const handleStart = (item: UpcomingWorkoutItem) => {
    onStartWorkout(item)
  }

  if (!schedule) return <p className="text-beefy-text-secondary dark:text-beefy-dark-text-muted">Нет расписания.</p>

  return (
    <div className="space-y-6 w-full max-w-xl min-w-0">
      <h2 className="text-lg font-semibold text-beefy-primary dark:text-beefy-dark-text">Ближайшие тренировки</h2>
      <p className="text-beefy-text-secondary dark:text-beefy-dark-text-muted text-sm">
        План: {plan?.name ?? ''}. Пн → A, Ср → B, Пт → C.
      </p>
      <ul className="space-y-4">
        {upcoming.map((item) => {
          const completed = 'completed' in item && item.completed
          return (
            <li
              key={`${item.date}-${item.workoutId}`}
              className={`border rounded-xl p-4 shadow-sm w-full ${
                completed
                  ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20'
                  : 'border-beefy-primary/20 dark:border-beefy-dark-border bg-white dark:bg-beefy-dark-bg-card'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="font-medium text-beefy-primary dark:text-beefy-dark-text text-sm sm:text-base">
                  {item.dayName}, {formatDate(new Date(item.date + 'T12:00:00'))}
                </span>
                <div className="flex items-center gap-2">
                  {completed && (
                    <span className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">Пройдена</span>
                  )}
                  <span className="text-beefy-text-secondary dark:text-beefy-dark-text-muted text-sm">{item.workoutName}</span>
                </div>
              </div>
              <ul className="text-sm text-beefy-text-secondary dark:text-beefy-dark-text-muted mb-4 space-y-1">
                {item.exercises.map((ex) => (
                  <li key={ex.id}>
                    {ex.name}
                    {ex.durationSec
                      ? ` — ${ex.sets.length}×${ex.durationSec} сек`
                      : ` — ${ex.sets.length}×${ex.sets[0]?.reps ?? 0} (${ex.sets[0]?.weightKg ?? 0} кг)`}
                  </li>
                ))}
              </ul>
              {completed ? (
                <div className="w-full min-h-[48px] py-3 sm:py-2.5 flex items-center justify-center rounded-lg bg-beefy-cream/60 dark:bg-beefy-dark-bg-card text-beefy-primary dark:text-beefy-dark-text-muted text-sm font-medium">
                  Тренировка выполнена сегодня
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleStart(item)}
                  className="w-full min-h-[48px] py-3 sm:py-2.5 bg-beefy-primary dark:bg-beefy-accent text-beefy-cream dark:text-white text-sm font-medium rounded-lg hover:opacity-90 active:opacity-80 touch-manipulation"
                >
                  Начать
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
