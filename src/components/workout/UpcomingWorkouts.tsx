import { useMemo } from 'react'
import {
  getSchedule,
  getUpcomingScheduleDates,
  getNextWeights,
  getTodayDateString,
  wasWorkoutCompletedOnDate,
  dateToLocalDateString,
  getWorkoutHistory,
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

  // Получаем последнюю тренировку из истории (только если она не сегодня)
  const lastWorkout = useMemo(() => {
    const history = getWorkoutHistory()
    if (history.length === 0) return null
    const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date))
    const last = sorted[0]!
    // Не показываем плашку, если последняя тренировка была сегодня (информация уже есть в карточке)
    if (last.date === todayStr) return null
    return last
  }, [todayStr])

  const upcoming = useMemo((): (UpcomingWorkoutItem & { 
    status: 'completed' | 'missed' | 'next' | 'upcoming'
  })[] => {
    if (!schedule || !plan) return []
    const dates = getUpcomingScheduleDates(schedule, 6)
    
    // Находим первую невыполненную тренировку
    let foundNext = false
    
    return dates.map(({ date, dayOfWeek }) => {
      const workoutId = schedule.byDay[dayOfWeek]
      const workout = getWorkoutByIdFromPlan(workoutId, plan)
      if (!workout) return null
      const exercises = buildWorkoutWithWeights(workout, weights)
      const dateStr = dateToLocalDateString(date)
      const isToday = dateStr === todayStr
      const isCompleted = wasWorkoutCompletedOnDate(dateStr, workoutId)
      const isPast = dateStr < todayStr
      
      let status: 'completed' | 'missed' | 'next' | 'upcoming'
      if (isToday && isCompleted) {
        status = 'completed'
      } else if (isPast && !isCompleted) {
        status = 'missed'
      } else if (!foundNext && !isCompleted) {
        status = 'next'
        foundNext = true
      } else {
        status = 'upcoming'
      }
      
      return {
        date: dateStr,
        dayName: DAY_NAMES[dayOfWeek] ?? '',
        workoutId,
        workoutName: workout.name,
        exercises,
        status,
      }
    }).filter(Boolean) as (UpcomingWorkoutItem & { 
      status: 'completed' | 'missed' | 'next' | 'upcoming'
    })[]
  }, [schedule, plan, weights, todayStr])

  const handleStart = (item: UpcomingWorkoutItem) => {
    onStartWorkout(item)
  }

  if (!schedule) return <p className="text-beefy-text-secondary dark:text-beefy-dark-text-muted">Нет расписания.</p>

  return (
    <div className="space-y-6 w-full max-w-xl min-w-0">
      <div>
        <h2 className="text-lg font-semibold text-beefy-primary dark:text-beefy-dark-text mb-2">Ближайшие тренировки</h2>
        <p className="text-beefy-text-secondary dark:text-beefy-dark-text-muted text-sm mb-3">
          План: {plan?.name ?? ''}. Пн → A, Ср → B, Пт → C.
        </p>
        {lastWorkout && (
          <div className="text-xs text-beefy-text-secondary dark:text-beefy-dark-text-muted bg-beefy-cream/30 dark:bg-beefy-dark-border/20 rounded-lg px-3 py-2 mb-4">
            Последняя тренировка: <span className="font-medium">{lastWorkout.workoutName}</span> — {formatDate(new Date(lastWorkout.date + 'T12:00:00'))}
          </div>
        )}
      </div>
      <ul className="space-y-4">
        {upcoming.map((item) => {
          const isCompleted = item.status === 'completed'
          const isMissed = item.status === 'missed'
          const isNext = item.status === 'next'
          
          return (
            <li
              key={`${item.date}-${item.workoutId}`}
              className={`border rounded-xl p-4 shadow-sm w-full transition-all ${
                isNext
                  ? 'border-beefy-primary dark:border-beefy-purple bg-beefy-primary/5 dark:bg-beefy-purple/10 ring-2 ring-beefy-primary/20 dark:ring-beefy-purple/30'
                  : isCompleted
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20'
                    : isMissed
                      ? 'border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-900/10 opacity-75'
                      : 'border-beefy-primary/20 dark:border-beefy-dark-border bg-white dark:bg-beefy-dark-bg-card'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {isNext && (
                    <span className="text-beefy-primary dark:text-beefy-cream-light text-xs font-semibold bg-beefy-primary/10 dark:bg-beefy-purple/20 px-2 py-0.5 rounded">
                      Следующая
                    </span>
                  )}
                  <span className="font-medium text-beefy-primary dark:text-beefy-dark-text text-sm sm:text-base">
                    {item.dayName}, {formatDate(new Date(item.date + 'T12:00:00'))}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isCompleted && (
                    <span className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">✓ Выполнена</span>
                  )}
                  {isMissed && (
                    <span className="text-amber-600 dark:text-amber-400 text-sm font-medium">Пропущена</span>
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
                      : (() => {
                          // Находим первый рабочий подход (не разминочный)
                          const workSet = ex.sets.find((s) => !s.isWarmup)
                          const workSetsCount = ex.sets.filter((s) => !s.isWarmup).length
                          return ` — ${workSetsCount}×${workSet?.reps ?? 0} (${workSet?.weightKg ?? 0} кг)`
                        })()}
                  </li>
                ))}
              </ul>
              {isNext ? (
                <button
                  type="button"
                  onClick={() => handleStart(item)}
                  className="w-full min-h-[48px] py-3 sm:py-2.5 bg-beefy-primary dark:bg-beefy-purple text-white text-sm font-medium rounded-lg hover:opacity-90 active:opacity-80 touch-manipulation shadow-md"
                >
                  Начать
                </button>
              ) : (
                <div className="w-full min-h-[48px] py-3 sm:py-2.5 flex items-center justify-center rounded-lg bg-beefy-cream/30 dark:bg-beefy-dark-bg-card/50 text-beefy-text-secondary dark:text-beefy-dark-text-muted text-sm">
                  {isMissed ? 'Пропущена' : 'Предстоящая'}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
