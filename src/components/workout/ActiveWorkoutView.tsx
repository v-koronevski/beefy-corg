import { useState, useEffect, useCallback } from 'react'
import { getNextWeightKg } from '@/data/helenPlan'
import type { ExerciseInWorkout } from '@/types'

export type ExerciseRating = 'deload' | 'same' | 'add'

const REST_SECONDS_5X5 = 180
const REST_SECONDS_OTHER = 90

function getRestSeconds(exercise: ExerciseInWorkout): number {
  return exercise.sets.length >= 5 ? REST_SECONDS_5X5 : REST_SECONDS_OTHER
}

export interface ActiveWorkoutViewProps {
  workoutName: string
  exercises: ExerciseInWorkout[]
  onComplete: (ratings: Record<string, ExerciseRating>) => void
}

export function ActiveWorkoutView({ workoutName, exercises, onComplete }: ActiveWorkoutViewProps) {
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [setIndex, setSetIndex] = useState(0)
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null)
  const [restTotal, setRestTotal] = useState<number | null>(null)
  const [exerciseRatings, setExerciseRatings] = useState<Record<string, ExerciseRating>>({})
  const [ratingExerciseIndex, setRatingExerciseIndex] = useState<number | null>(null)

  const exercise = exercises[exerciseIndex]
  const workSet = exercise?.sets[setIndex]
  const isResting = restSecondsLeft !== null
  const ratingExercise = ratingExerciseIndex !== null ? exercises[ratingExerciseIndex ?? 0] : null

  const advanceToNext = useCallback(() => {
    if (!exercise) return
    const nextSet = setIndex + 1
    if (nextSet < exercise.sets.length) {
      setSetIndex(nextSet)
      return
    }
    const nextEx = exerciseIndex + 1
    if (nextEx < exercises.length) {
      setExerciseIndex(nextEx)
      setSetIndex(0)
      return
    }
    onComplete(exerciseRatings)
  }, [exercise, exerciseIndex, setIndex, exercises.length, onComplete, exerciseRatings])

  const finishExerciseAndMaybeRate = useCallback(() => {
    if (!exercise) return
    if (exercise.durationSec) {
      advanceToNext()
      return
    }
    setRatingExerciseIndex(exerciseIndex)
  }, [exercise, exerciseIndex, advanceToNext])

  useEffect(() => {
    if (restSecondsLeft === null || restSecondsLeft <= 0) return
    const t = setInterval(() => {
      setRestSecondsLeft((s) => {
        if (s === null || s <= 1) {
          clearInterval(t)
          advanceToNext()
          return null
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [restSecondsLeft, advanceToNext])

  const handleCompleteSet = () => {
    if (!exercise) return
    const isLastSet = setIndex + 1 >= exercise.sets.length
    if (isLastSet) {
      finishExerciseAndMaybeRate()
      return
    }
    setRestTotal(getRestSeconds(exercise))
    setRestSecondsLeft(getRestSeconds(exercise))
  }

  const handleSkipSet = () => {
    if (workSet) workSet.skipped = true
    const nextSet = setIndex + 1
    if (nextSet < (exercise?.sets.length ?? 0)) {
      advanceToNext()
    } else {
      finishExerciseAndMaybeRate()
    }
  }

  if (!exercise || workSet === undefined) {
    onComplete(exerciseRatings)
    return null
  }

  const setLabel = `Подход ${setIndex + 1} из ${exercise.sets.length}`
  const isDurationSet = !!exercise.durationSec

  const handleStartEarly = () => {
    setRestSecondsLeft(null)
    setRestTotal(null)
    advanceToNext()
  }

  const handleRating = (choice: ExerciseRating) => {
    if (ratingExercise == null) return
    setExerciseRatings((prev) => ({ ...prev, [ratingExercise.id]: choice }))
    setRatingExerciseIndex(null)
    if (exerciseIndex + 1 < exercises.length) {
      setExerciseIndex(exerciseIndex + 1)
      setSetIndex(0)
    } else {
      onComplete({ ...exerciseRatings, [ratingExercise.id]: choice })
    }
  }

  if (ratingExercise != null) {
    const currentKg = ratingExercise.sets[0]?.weightKg ?? 0
    return (
      <div className="space-y-6 w-full min-w-0 max-w-full">
        <p className="text-slate-500 dark:text-beefy-dark-text-muted text-sm">{workoutName}</p>
        <div className="bg-white dark:bg-beefy-dark-bg-card rounded-xl border border-slate-200 dark:border-beefy-dark-border p-4 sm:p-6 shadow-sm w-full">
          <h3 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-beefy-dark-text mb-2">{ratingExercise.name}</h3>
          <p className="text-slate-600 dark:text-beefy-dark-text-muted text-sm mb-4">
            План на следующую тренировку:
          </p>
          <div className="flex flex-col sm:flex-wrap sm:flex-row gap-2">
            {(['deload', 'same', 'add'] as const).map((choice) => {
              const nextKg = getNextWeightKg(choice, currentKg, ratingExercise.id)
              const label =
                choice === 'deload' ? `Понизить вес → ${nextKg} кг` : choice === 'same' ? `Оставить → ${currentKg} кг` : `Добавить вес → ${nextKg} кг`
              return (
                <button
                  key={choice}
                  type="button"
                  onClick={() => handleRating(choice)}
                  className={`min-h-[48px] px-4 py-3 sm:py-2.5 rounded-xl text-sm font-medium touch-manipulation w-full sm:w-auto ${
                    choice === 'deload'
                      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                      : choice === 'add'
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                        : 'bg-slate-100 dark:bg-beefy-dark-border/30 text-slate-800 dark:text-beefy-dark-text border border-slate-300 dark:border-beefy-dark-border'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  if (isResting && restSecondsLeft !== null && restTotal !== null) {
    const mins = Math.floor(restSecondsLeft / 60)
    const secs = restSecondsLeft % 60
    const progress = 1 - restSecondsLeft / restTotal
    const size = 200
    const strokeWidth = 10
    const r = (size - strokeWidth) / 2
    const cx = size / 2
    const cy = size / 2
    const circumference = 2 * Math.PI * r
    const strokeDashoffset = circumference - progress * circumference
    return (
      <div className="flex flex-col items-center justify-center min-h-[45vh] sm:min-h-[50vh] px-4 w-full">
        <p className="text-slate-500 dark:text-beefy-dark-text-muted text-sm mb-4">Отдых</p>
        <div className="relative inline-flex items-center justify-center">
          <svg width={size} height={size} className="-rotate-90" aria-hidden>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-slate-200 dark:text-beefy-dark-border"
            />
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="text-slate-600 dark:text-beefy-dark-text-muted transition-all duration-1000"
            />
          </svg>
          <span className="absolute text-4xl sm:text-5xl font-mono font-bold text-slate-800 dark:text-beefy-dark-text tabular-nums">
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
        </div>
        <p className="text-slate-400 dark:text-beefy-dark-text-muted text-sm mt-4">Следующий подход через...</p>
        <button
          type="button"
          onClick={handleStartEarly}
          className="mt-8 w-full max-w-xs min-h-[48px] py-3 border border-slate-300 dark:border-beefy-dark-border text-slate-600 dark:text-beefy-dark-text-muted rounded-xl hover:bg-slate-100 dark:hover:bg-beefy-dark-border/30 active:bg-slate-200 dark:active:bg-beefy-dark-border/50 font-medium touch-manipulation"
        >
          Начать раньше
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full max-w-xl min-w-0">
      <p className="text-slate-500 dark:text-beefy-dark-text-muted text-sm">{workoutName}</p>
      <div className="bg-white dark:bg-beefy-dark-bg-card rounded-xl border border-slate-200 dark:border-beefy-dark-border p-4 sm:p-6 shadow-sm w-full">
        <p className="text-slate-500 dark:text-beefy-dark-text-muted text-sm mb-1">{setLabel}</p>
        <h3 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-beefy-dark-text mb-2">{exercise.name}</h3>
        {isDurationSet ? (
          <p className="text-slate-600 dark:text-beefy-dark-text-muted text-base sm:text-lg">
            Удержание {exercise.durationSec} сек
          </p>
        ) : (
          <p className="text-xl sm:text-2xl font-medium text-slate-800 dark:text-beefy-dark-text">
            {workSet.weightKg} кг × {workSet.reps} повторений
          </p>
        )}
      </div>
      <div className="flex flex-col gap-3 w-full">
        <button
          type="button"
          onClick={handleCompleteSet}
          className="w-full min-h-[52px] py-4 bg-emerald-600 dark:bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-500 dark:hover:bg-emerald-400 active:bg-emerald-700 dark:active:bg-emerald-600 touch-manipulation text-base"
        >
          Готово
        </button>
        <button
          type="button"
          onClick={handleSkipSet}
          className="w-full min-h-[48px] py-3 border border-slate-300 dark:border-beefy-dark-border text-slate-600 dark:text-beefy-dark-text-muted rounded-xl hover:bg-slate-100 dark:hover:bg-beefy-dark-border/30 active:bg-slate-200 dark:active:bg-beefy-dark-border/50 touch-manipulation"
        >
          Пропустить подход
        </button>
      </div>
      <ul className="text-xs sm:text-sm text-slate-500 dark:text-beefy-dark-text-muted space-y-1">
        {exercises.map((ex, ei) => (
          <li key={ex.id}>
            {ex.name}:{' '}
            {ex.sets.map((s, si) => {
              const isCurrent = ei === exerciseIndex && si === setIndex
              const done = ei < exerciseIndex || (ei === exerciseIndex && si < setIndex) || s.skipped
              return (
                <span key={si} className={isCurrent ? 'font-medium text-slate-800 dark:text-beefy-dark-text' : ''}>
                  {done ? (s.skipped ? '—' : '✓') : isCurrent ? '●' : '○'}
                  {si < ex.sets.length - 1 ? ', ' : ''}
                </span>
              )
            })}
          </li>
        ))}
      </ul>
    </div>
  )
}
