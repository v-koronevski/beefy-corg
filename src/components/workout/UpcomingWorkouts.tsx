import { useState, useMemo, useEffect } from 'react'
import {
  getSchedule,
  getNextWeights,
  getTodayDateString,
  wasWorkoutCompletedOnDate,
  getWorkoutHistory,
  getPlannedScheduleDates,
  setPlannedScheduleDates,
  type PlannedWorkoutDate,
} from '@/utils/storage'
import { getPlanById, getWorkoutByIdFromPlan } from '@/data/plans'
import { buildWorkoutWithWeights } from '@/data/helenPlan'
import type { UpcomingWorkoutItem } from '@/types'

const DAY_NAMES: Record<number, string> = {
  1: 'Пн',
  2: 'Вт',
  3: 'Ср',
  4: 'Чт',
  5: 'Пт',
  6: 'Сб',
  7: 'Вс',
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

function getDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00').getDay()
  const day = d === 0 ? 7 : d
  return DAY_NAMES[day as keyof typeof DAY_NAMES] ?? ''
}

export function UpcomingWorkouts({ onStartWorkout }: UpcomingWorkoutsProps) {
  const schedule = getSchedule()
  const planId = schedule?.planId
  const plan = planId ? getPlanById(planId) : null
  const weights = planId ? getNextWeights(planId) : {}

  const todayStr = getTodayDateString()

  const [plannedDates, setPlannedDates] = useState<PlannedWorkoutDate[]>(() =>
    schedule ? getPlannedScheduleDates(schedule) : []
  )
  const [editingDateFor, setEditingDateFor] = useState<{ date: string; workoutId: string; workoutName: string } | null>(null)

  useEffect(() => {
    if (schedule && plannedDates.length === 0) {
      setPlannedDates(getPlannedScheduleDates(schedule))
    }
  }, [schedule])

  // Получаем последнюю тренировку из истории (только если она не сегодня)
  const lastWorkout = useMemo(() => {
    const history = getWorkoutHistory()
    if (history.length === 0) return null
    const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date))
    const last = sorted[0]!
    if (last.date === todayStr) return null
    return last
  }, [todayStr])

  const upcoming = useMemo((): (UpcomingWorkoutItem & {
    status: 'completed' | 'missed' | 'next' | 'upcoming'
  })[] => {
    if (!schedule || !plan || plannedDates.length === 0) return []

    const sorted = [...plannedDates].sort((a, b) => a.date.localeCompare(b.date))
    let foundNext = false

    return sorted.map(({ date: dateStr, workoutId }) => {
      const workout = getWorkoutByIdFromPlan(workoutId, plan)
      if (!workout) return null
      const exercises = buildWorkoutWithWeights(workout, weights)
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
        dayName: getDayName(dateStr),
        workoutId,
        workoutName: workout.name,
        exercises,
        status,
      }
    }).filter(Boolean) as (UpcomingWorkoutItem & {
      status: 'completed' | 'missed' | 'next' | 'upcoming'
    })[]
  }, [schedule, plan, weights, todayStr, plannedDates])

  const handleStart = (item: UpcomingWorkoutItem) => {
    onStartWorkout(item)
  }

  const handleSaveDate = (oldDate: string, workoutId: string, newDate: string) => {
    if (!schedule) return
    const next = plannedDates.map((p) =>
      p.date === oldDate && p.workoutId === workoutId ? { ...p, date: newDate } : p
    )
    setPlannedScheduleDates(next)
    setPlannedDates(next)
    setEditingDateFor(null)
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
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {isNext && (
                    <span className="text-beefy-primary dark:text-beefy-cream-light text-xs font-semibold bg-beefy-primary/10 dark:bg-beefy-purple/20 px-2 py-0.5 rounded shrink-0">
                      Следующая
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingDateFor({ date: item.date, workoutId: item.workoutId, workoutName: item.workoutName })}
                    className="font-medium text-beefy-primary dark:text-beefy-dark-text text-sm sm:text-base hover:underline text-left shrink-0"
                  >
                    {item.dayName}, {formatDate(new Date(item.date + 'T12:00:00'))}
                  </button>
                </div>
                <div className="flex items-center gap-2 min-w-0 shrink">
                  {isCompleted && (
                    <span className="text-emerald-600 dark:text-emerald-400 text-sm font-medium shrink-0">✓ Выполнена</span>
                  )}
                  {isMissed && (
                    <span className="text-amber-600 dark:text-amber-400 text-sm font-medium shrink-0">Пропущена</span>
                  )}
                  <span className="text-beefy-text-secondary dark:text-beefy-dark-text-muted text-sm truncate" title={item.workoutName}>{item.workoutName}</span>
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
              ) : isMissed ? (
                <button
                  type="button"
                  onClick={() => handleStart(item)}
                  className="w-full min-h-[48px] py-3 sm:py-2.5 bg-amber-500 dark:bg-amber-600 text-white text-sm font-medium rounded-lg hover:opacity-90 active:opacity-80 touch-manipulation"
                >
                  Начать (пропущенная)
                </button>
              ) : (
                <div className="w-full min-h-[48px] py-3 sm:py-2.5 flex items-center justify-center rounded-lg bg-beefy-cream/30 dark:bg-beefy-dark-bg-card/50 text-beefy-text-secondary dark:text-beefy-dark-text-muted text-sm">
                  Предстоящая
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {editingDateFor && (
        <ChangeDateModal
          workoutName={editingDateFor.workoutName}
          currentDate={editingDateFor.date}
          onSave={(newDate) => handleSaveDate(editingDateFor.date, editingDateFor.workoutId, newDate)}
          onCancel={() => setEditingDateFor(null)}
        />
      )}
    </div>
  )
}

interface ChangeDateModalProps {
  workoutName: string
  currentDate: string
  onSave: (newDate: string) => void
  onCancel: () => void
}

function ChangeDateModal({ workoutName, currentDate, onSave, onCancel }: ChangeDateModalProps) {
  const [date, setDate] = useState(currentDate)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 min-h-[100dvh]"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-beefy-dark-bg-card rounded-xl shadow-lg p-6 w-full max-w-sm border border-beefy-primary/20 dark:border-beefy-dark-border"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-beefy-primary dark:text-beefy-dark-text mb-2">
          Изменить дату
        </h3>
        <p className="text-sm text-beefy-text-secondary dark:text-beefy-dark-text-muted mb-4">
          {workoutName}
        </p>
        <div className="space-y-4">
          <div className="w-full max-w-[90%] [&_input[type=date]]:min-h-[48px]">
            <label htmlFor="schedule-date-input" className="block text-sm font-medium text-beefy-primary dark:text-beefy-dark-text mb-2">
              Дата
            </label>
            <input
              id="schedule-date-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full max-w-full min-h-[48px] px-4 py-2 text-base border-2 border-beefy-primary/30 dark:border-beefy-dark-border rounded-lg bg-white dark:bg-beefy-dark-bg text-beefy-primary dark:text-beefy-dark-text box-border touch-manipulation"
              style={{ minHeight: 48 }}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 min-h-[48px] px-4 py-2 text-sm font-medium rounded-lg border border-beefy-primary/20 dark:border-beefy-dark-border text-beefy-primary dark:text-beefy-dark-text hover:bg-beefy-cream/50 dark:hover:bg-beefy-dark-border/30 transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => onSave(date)}
              className="flex-1 min-h-[48px] px-4 py-2 text-sm font-medium rounded-lg bg-beefy-primary dark:bg-beefy-purple text-white hover:opacity-90 active:opacity-80 transition-opacity"
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
