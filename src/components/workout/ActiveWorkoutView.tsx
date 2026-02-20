import { useState, useEffect, useCallback, useMemo } from 'react'
import { getNextWeightKg } from '@/data/helenPlan'
import { getWorkoutHistory } from '@/utils/storage'
import { getExerciseTechnique } from '@/data/exerciseTechniques'
import type { ExerciseInWorkout } from '@/types'

export type ExerciseRating = 'deload' | 'same' | 'add'

const REST_SECONDS_5X5 = 180
const REST_SECONDS_OTHER = 90
const REST_SECONDS_WARMUP = 60 // Отдых между разминочными подходами

function getRestSeconds(exercise: ExerciseInWorkout, isWarmup: boolean = false): number {
  if (isWarmup) return REST_SECONDS_WARMUP
  return exercise.sets.length >= 5 ? REST_SECONDS_5X5 : REST_SECONDS_OTHER
}

export interface ActiveWorkoutViewProps {
  workoutName: string
  exercises: ExerciseInWorkout[]
  onComplete: (ratings: Record<string, ExerciseRating>, exerciseNotes: Record<string, string>) => void
}

export function ActiveWorkoutView({ workoutName, exercises, onComplete }: ActiveWorkoutViewProps) {
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [setIndex, setSetIndex] = useState(0)
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null)
  const [restTotal, setRestTotal] = useState<number | null>(null)
  const [exerciseRatings, setExerciseRatings] = useState<Record<string, ExerciseRating>>({})
  const [ratingExerciseIndex, setRatingExerciseIndex] = useState<number | null>(null)
  const [exerciseTimerSeconds, setExerciseTimerSeconds] = useState<number | null>(null)
  const [editingReps, setEditingReps] = useState<{ exerciseIndex: number; setIndex: number } | null>(null)
  const [tempRepsValue, setTempRepsValue] = useState('')
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({})
  const [infoExercise, setInfoExercise] = useState<{ id: string; name: string } | null>(null)

  const exercise = exercises[exerciseIndex]
  const workSet = exercise?.sets[setIndex]
  const isResting = restSecondsLeft !== null
  const ratingExercise = ratingExerciseIndex !== null ? exercises[ratingExerciseIndex ?? 0] : null
  
  // Разделяем подходы на разминочные и рабочие
  const exerciseSets = exercise ? {
    warmup: exercise.sets.filter((s) => s.isWarmup),
    work: exercise.sets.filter((s) => !s.isWarmup),
  } : { warmup: [], work: [] }
  
  // Определяем текущий тип подхода (разминочный или рабочий) и индекс в типе
  const isWarmupSet = workSet?.isWarmup ?? false
  let currentSetIndexInType = 0
  if (exercise) {
    if (isWarmupSet) {
      // Считаем сколько разминочных подходов до текущего
      for (let i = 0; i < setIndex; i++) {
        if (exercise.sets[i]?.isWarmup) {
          currentSetIndexInType++
        }
      }
    } else {
      // Для рабочих подходов вычитаем количество разминочных
      currentSetIndexInType = setIndex - exerciseSets.warmup.length
    }
  }

  const advanceToNext = useCallback(() => {
    if (!exercise) return
    // Сбрасываем таймер упражнения при переходе
    setExerciseTimerSeconds(null)
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
    onComplete(exerciseRatings, exerciseNotes)
  }, [exercise, exerciseIndex, setIndex, exercises.length, onComplete, exerciseRatings])

  const finishExerciseAndMaybeRate = useCallback(() => {
    if (!exercise) return
    // Для упражнений с весом показываем экран выбора веса
    if (!exercise.durationSec && !exercise.bodyweight) {
      setRatingExerciseIndex(exerciseIndex)
      return
    }
    // Для упражнений без веса (bodyweight/durationSec) сразу переходим к следующему
    // Но сначала проверяем, не последнее ли это упражнение
    const nextEx = exerciseIndex + 1
    if (nextEx >= exercises.length) {
      // Последнее упражнение - завершаем тренировку
      onComplete(exerciseRatings, exerciseNotes)
    } else {
      // Переходим к следующему упражнению
      setExerciseIndex(nextEx)
      setSetIndex(0)
    }
  }, [exercise, exerciseIndex, exercises.length, onComplete, exerciseRatings, exerciseNotes])

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

  // Сбрасываем таймер при смене упражнения или подхода
  useEffect(() => {
    setExerciseTimerSeconds(null)
  }, [exerciseIndex, setIndex])

  // Таймер для упражнений на время
  useEffect(() => {
    if (exerciseTimerSeconds === null || exerciseTimerSeconds <= 0) {
      if (exerciseTimerSeconds === 0 && exercise?.durationSec) {
        // Таймер закончился - переходим на отдых
        const isLastSet = setIndex + 1 >= exercise.sets.length
        if (isLastSet) {
          finishExerciseAndMaybeRate()
        } else {
          setRestTotal(getRestSeconds(exercise))
          setRestSecondsLeft(getRestSeconds(exercise))
        }
        setExerciseTimerSeconds(null)
      }
      return
    }
    const t = setInterval(() => {
      setExerciseTimerSeconds((s) => {
        if (s === null || s <= 1) {
          clearInterval(t)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [exerciseTimerSeconds, exercise, setIndex, finishExerciseAndMaybeRate])

  const handleStartExerciseTimer = () => {
    if (!exercise?.durationSec) return
    setExerciseTimerSeconds(exercise.durationSec)
  }

  const handleCompleteSet = () => {
    if (!exercise) return
    // Если упражнение на время и таймер не запущен - запускаем таймер
    if (exercise.durationSec && exerciseTimerSeconds === null) {
      handleStartExerciseTimer()
      return
    }
    // Если таймер запущен - останавливаем и завершаем подход
    if (exerciseTimerSeconds !== null) {
      setExerciseTimerSeconds(null)
    }
    const isLastSet = setIndex + 1 >= exercise.sets.length
    if (isLastSet) {
      finishExerciseAndMaybeRate()
      return
    }
    // Для разминочных подходов короткий отдых
    const isWarmupSet = workSet?.isWarmup
    if (isWarmupSet) {
      setRestTotal(getRestSeconds(exercise, true))
      setRestSecondsLeft(getRestSeconds(exercise, true))
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
    onComplete(exerciseRatings, exerciseNotes)
    return null
  }

  const warmupCount = exerciseSets.warmup.length
  const workCount = exerciseSets.work.length
  const setLabel = isWarmupSet
    ? `Разминка ${currentSetIndexInType + 1} из ${warmupCount}`
    : `Рабочий подход ${currentSetIndexInType + 1} из ${workCount}`
  const isDurationSet = !!exercise.durationSec
  const isExerciseTimerRunning = exerciseTimerSeconds !== null && exerciseTimerSeconds > 0

  const handleStartEarly = () => {
    setRestSecondsLeft(null)
    setRestTotal(null)
    advanceToNext()
  }

  const handleEditReps = () => {
    if (!exercise || workSet === undefined) return
    setTempRepsValue(String(workSet.reps))
    setEditingReps({ exerciseIndex, setIndex })
  }

  const handleSaveReps = (newReps: number) => {
    if (!editingReps || newReps < 0) return
    const ex = exercises[editingReps.exerciseIndex]
    const set = ex?.sets[editingReps.setIndex]
    if (set) {
      set.reps = Math.max(0, Math.floor(newReps))
    }
    setEditingReps(null)
    setTempRepsValue('')
  }

  const handleCancelEditReps = () => {
    setEditingReps(null)
    setTempRepsValue('')
  }

  const handleRating = (choice: ExerciseRating) => {
    if (ratingExercise == null) return
    setExerciseRatings((prev) => ({ ...prev, [ratingExercise.id]: choice }))
    
    // Проверяем, не последнее ли это упражнение в тренировке
    const nextEx = exerciseIndex + 1
    if (nextEx >= exercises.length) {
      // Последнее упражнение - завершаем тренировку с заметками
      onComplete({ ...exerciseRatings, [ratingExercise.id]: choice }, exerciseNotes)
    } else {
      // Переходим к следующему упражнению
      setRatingExerciseIndex(null)
      setExerciseIndex(nextEx)
      setSetIndex(0)
    }
  }

  // Проверяем, нужно ли рекомендовать повышение веса
  const shouldRecommendIncrease = useMemo(() => {
    if (!ratingExercise) return false
    
    // Находим первый рабочий подход (не разминочный)
    const workSet = ratingExercise.sets.find((s) => !s.isWarmup)
    const currentKg = workSet?.weightKg ?? 0
    if (currentKg === 0) return false // Не показываем для упражнений без веса
    
    const history = getWorkoutHistory()
    // Сортируем по дате (новые сначала)
    const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date))
    
    // Находим последние две тренировки с этим упражнением
    const lastTwoWeights: number[] = []
    for (const entry of sorted) {
      const exercise = entry.exercises.find((e) => e.id === ratingExercise.id)
      if (!exercise) continue
      
      // Находим максимальный вес из выполненных подходов
      let maxWeight = 0
      let hasCompletedSets = false
      for (const set of exercise.sets) {
        if (set.skipped) continue
        hasCompletedSets = true
        if (set.weightKg > 0) {
          maxWeight = Math.max(maxWeight, set.weightKg)
        }
      }
      
      // Если есть выполненные подходы с весом
      if (hasCompletedSets && maxWeight > 0) {
        lastTwoWeights.push(maxWeight)
        if (lastTwoWeights.length >= 2) break
      }
    }
    
    // Если есть две тренировки с одинаковым весом, и текущий вес такой же
    // Рекомендуем повышение
    if (lastTwoWeights.length === 2 && 
        lastTwoWeights[0] === lastTwoWeights[1] && 
        currentKg === lastTwoWeights[0]) {
      return true
    }
    
    return false
  }, [ratingExercise])

  const infoTechnique = infoExercise ? getExerciseTechnique(infoExercise.id) : null
  const TechniqueModal = infoExercise && infoTechnique ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70"
      onClick={() => setInfoExercise(null)}
    >
      <div
        className="bg-white dark:bg-beefy-dark-bg-card rounded-xl shadow-lg p-6 w-full max-w-md max-h-[85vh] overflow-y-auto border border-beefy-primary/20 dark:border-beefy-dark-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-lg font-semibold text-beefy-primary dark:text-beefy-dark-text">
            {infoExercise.name}
          </h3>
          <button
            type="button"
            onClick={() => setInfoExercise(null)}
            className="shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-beefy-dark-border/50 touch-manipulation"
            aria-label="Закрыть"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-slate-600 dark:text-beefy-dark-text-muted leading-relaxed">
          {infoTechnique}
        </p>
      </div>
    </div>
  ) : null

  if (ratingExercise != null) {
    // Находим первый рабочий подход (не разминочный)
    const workSet = ratingExercise.sets.find((s) => !s.isWarmup)
    const currentKg = workSet?.weightKg ?? 0
    return (
      <>
      <div className="space-y-6 w-full min-w-0 max-w-full">
        <p className="text-slate-500 dark:text-beefy-dark-text-muted text-sm">{workoutName}</p>
        <div className="bg-white dark:bg-beefy-dark-bg-card rounded-xl border border-slate-200 dark:border-beefy-dark-border p-4 sm:p-6 shadow-sm w-full">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-beefy-dark-text">{ratingExercise.name}</h3>
            {getExerciseTechnique(ratingExercise.id) && (
              <button
                type="button"
                onClick={() => setInfoExercise({ id: ratingExercise.id, name: ratingExercise.name })}
                className="shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full text-slate-500 dark:text-beefy-dark-text-muted hover:bg-slate-200 dark:hover:bg-beefy-dark-border/50 hover:text-slate-700 dark:hover:text-beefy-dark-text touch-manipulation"
                aria-label="Техника упражнения"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
              </button>
            )}
          </div>
          {shouldRecommendIncrease && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
                <span>💡</span>
                <span>Рекомендация: вы тренировались с весом {currentKg} кг уже две тренировки подряд. Рекомендуется повысить вес.</span>
              </p>
            </div>
          )}
          <p className="text-slate-600 dark:text-beefy-dark-text-muted text-sm mb-4">
            План на следующую тренировку:
          </p>
          <div className="flex flex-col sm:flex-wrap sm:flex-row gap-2">
            {(['deload', 'same', 'add'] as const).map((choice) => {
              const nextKg = getNextWeightKg(choice, currentKg, ratingExercise.id)
              const label =
                choice === 'deload' ? `Понизить вес → ${nextKg} кг` : choice === 'same' ? `Оставить → ${currentKg} кг` : `Добавить вес → ${nextKg} кг`
              const isRecommended = shouldRecommendIncrease && choice === 'add'
              return (
                <button
                  key={choice}
                  type="button"
                  onClick={() => handleRating(choice)}
                  className={`min-h-[48px] px-4 py-3 sm:py-2.5 rounded-xl text-sm font-medium touch-manipulation w-full sm:w-auto relative ${
                    choice === 'deload'
                      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                      : choice === 'add'
                        ? isRecommended
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-2 border-blue-400 dark:border-blue-600 shadow-md'
                          : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                        : 'bg-slate-100 dark:bg-beefy-dark-border/30 text-slate-800 dark:text-beefy-dark-text border border-slate-300 dark:border-beefy-dark-border'
                  }`}
                >
                  {isRecommended && (
                    <span className="absolute -top-1 -right-1 text-xs">⭐</span>
                  )}
                  {label}
                </button>
              )
            })}
          </div>
          {/* Заметки показываются для каждого упражнения */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-beefy-dark-border">
            <label htmlFor={`exercise-notes-${ratingExercise.id}`} className="block text-sm font-semibold text-slate-800 dark:text-beefy-dark-text mb-2">
              📝 Заметки к упражнению (необязательно)
            </label>
            <textarea
              id={`exercise-notes-${ratingExercise.id}`}
              value={exerciseNotes[ratingExercise.id] || ''}
              onChange={(e) => setExerciseNotes((prev) => ({ ...prev, [ratingExercise.id]: e.target.value }))}
              placeholder="Как прошло упражнение? Что заметил? Что можно улучшить?"
              rows={3}
              className="w-full px-4 py-3 text-sm border-2 border-slate-300 dark:border-beefy-dark-border rounded-xl bg-white dark:bg-beefy-dark-bg text-slate-800 dark:text-beefy-dark-text placeholder:text-slate-400 dark:placeholder:text-beefy-dark-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 resize-none"
            />
            {(exerciseNotes[ratingExercise.id]?.trim()) && (
              <p className="text-xs text-slate-500 dark:text-beefy-dark-text-muted mt-1">
                Заметки будут сохранены вместе с упражнением
              </p>
            )}
          </div>
        </div>
      </div>
      {TechniqueModal}
      </>
    )
  }

  if (isResting && restSecondsLeft !== null && restTotal !== null && exercise) {
    const nextSetIdx = setIndex + 1
    // Note: no info icon during rest - exercise name shown is "next" exercise
    const nextIsSameExercise = nextSetIdx < exercise.sets.length
    const nextExercise = nextIsSameExercise ? exercise : exercises[exerciseIndex + 1]
    const nextSet = nextIsSameExercise ? exercise.sets[nextSetIdx] : nextExercise?.sets[0]
    const nextName = nextExercise?.name ?? ''
    const nextWeight = nextSet && !nextExercise?.bodyweight && !nextExercise?.durationSec ? nextSet.weightKg : null
    const nextReps = nextSet?.reps
    const nextDuration = nextSet?.durationSec ?? nextExercise?.durationSec

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
      <>
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
        {nextName && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-slate-100 dark:bg-beefy-dark-border/30 border border-slate-200 dark:border-beefy-dark-border w-full max-w-xs text-center">
            <p className="font-medium text-slate-800 dark:text-beefy-dark-text">{nextName}</p>
            {nextDuration != null && nextDuration > 0 ? (
              <p className="text-slate-600 dark:text-beefy-dark-text-muted text-sm mt-1">{nextDuration} сек</p>
            ) : nextWeight != null && nextWeight > 0 ? (
              <p className="text-slate-600 dark:text-beefy-dark-text-muted text-sm mt-1">
                {nextWeight} кг{nextReps != null && nextReps > 0 ? ` × ${nextReps}` : ''}
              </p>
            ) : nextExercise?.bodyweight || nextWeight === 0 ? (
              <p className="text-slate-600 dark:text-beefy-dark-text-muted text-sm mt-1">
                {nextReps != null && nextReps > 0 ? `${nextReps} повторений` : 'собственный вес'}
              </p>
            ) : null}
          </div>
        )}
        <button
          type="button"
          onClick={handleStartEarly}
          className="mt-8 w-full max-w-xs min-h-[48px] py-3 border border-slate-300 dark:border-beefy-dark-border text-slate-600 dark:text-beefy-dark-text-muted rounded-xl hover:bg-slate-100 dark:hover:bg-beefy-dark-border/30 active:bg-slate-200 dark:active:bg-beefy-dark-border/50 font-medium touch-manipulation"
        >
          Начать раньше
        </button>
      </div>
      {TechniqueModal}
      </>
    )
  }

  // Модальное окно редактирования повторений
  if (editingReps) {
    const editingExercise = exercises[editingReps.exerciseIndex]
    return (
      <>
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-beefy-dark-bg-card rounded-xl border border-slate-200 dark:border-beefy-dark-border p-6 shadow-lg max-w-sm w-full">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-beefy-dark-text mb-2">
            Изменить количество повторений
          </h3>
          <p className="text-sm text-slate-600 dark:text-beefy-dark-text-muted mb-4">
            {editingExercise?.name} — подход {editingReps.setIndex + 1}
          </p>
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 dark:text-beefy-dark-text mb-2">
              Повторений:
            </label>
            <input
              type="number"
              min="0"
              value={tempRepsValue}
              onChange={(e) => setTempRepsValue(e.target.value)}
              className="w-full px-4 py-3 text-lg border border-slate-300 dark:border-beefy-dark-border rounded-xl bg-white dark:bg-beefy-dark-bg text-slate-800 dark:text-beefy-dark-text focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveReps(Number(tempRepsValue))
                } else if (e.key === 'Escape') {
                  handleCancelEditReps()
                }
              }}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancelEditReps}
              className="flex-1 min-h-[48px] py-3 border border-slate-300 dark:border-beefy-dark-border text-slate-600 dark:text-beefy-dark-text-muted rounded-xl hover:bg-slate-100 dark:hover:bg-beefy-dark-border/30 font-medium touch-manipulation"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => handleSaveReps(Number(tempRepsValue))}
              className="flex-1 min-h-[48px] py-3 bg-emerald-600 dark:bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-500 dark:hover:bg-emerald-400 active:bg-emerald-700 dark:active:bg-emerald-600 touch-manipulation"
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
      {TechniqueModal}
      </>
    )
  }

  return (
    <>
    <div className="space-y-6 w-full max-w-xl min-w-0">
      <p className="text-slate-500 dark:text-beefy-dark-text-muted text-sm">{workoutName}</p>
      <div className="bg-white dark:bg-beefy-dark-bg-card rounded-xl border border-slate-200 dark:border-beefy-dark-border p-4 sm:p-6 shadow-sm w-full">
        <p className="text-slate-500 dark:text-beefy-dark-text-muted text-sm mb-1">{setLabel}</p>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-beefy-dark-text">{exercise.name}</h3>
          {getExerciseTechnique(exercise.id) && (
            <button
              type="button"
              onClick={() => setInfoExercise({ id: exercise.id, name: exercise.name })}
              className="shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full text-slate-500 dark:text-beefy-dark-text-muted hover:bg-slate-200 dark:hover:bg-beefy-dark-border/50 hover:text-slate-700 dark:hover:text-beefy-dark-text touch-manipulation"
              aria-label="Техника упражнения"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
            </button>
          )}
        </div>
        {isDurationSet ? (
          <div className="space-y-4">
            {isExerciseTimerRunning ? (
              <div className="flex flex-col items-center">
                <div className="text-5xl sm:text-6xl font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mb-2">
                  {exerciseTimerSeconds}
                </div>
                <p className="text-slate-600 dark:text-beefy-dark-text-muted text-sm">секунд осталось</p>
              </div>
            ) : (
              <p className="text-slate-600 dark:text-beefy-dark-text-muted text-base sm:text-lg">
                Удержание {exercise.durationSec} сек
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {isWarmupSet && (
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                Разминочный подход
              </p>
            )}
            <div className="flex items-center gap-2">
              <p className={`text-xl sm:text-2xl font-medium ${isWarmupSet ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-beefy-dark-text'}`}>
                {workSet.weightKg} кг ×{' '}
                {!isWarmupSet && (
                  <button
                    type="button"
                    onClick={handleEditReps}
                    className="underline decoration-dotted hover:decoration-solid focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 rounded px-1"
                    title="Изменить количество повторений"
                  >
                    {workSet.reps}
                  </button>
                )}
                {isWarmupSet && <span>{workSet.reps}</span>}{' '}
                повторений
              </p>
            </div>
            {isWarmupSet && warmupCount > 0 && (
              <p className="text-xs text-slate-500 dark:text-beefy-dark-text-muted">
                После разминки: {workCount} рабочих подходов по {exerciseSets.work[0]?.weightKg ?? 0} кг
              </p>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3 w-full">
        <button
          type="button"
          onClick={handleCompleteSet}
          className="w-full min-h-[52px] py-4 bg-emerald-600 dark:bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-500 dark:hover:bg-emerald-400 active:bg-emerald-700 dark:active:bg-emerald-600 touch-manipulation text-base"
        >
          {isDurationSet && !isExerciseTimerRunning ? 'Начать' : 'Готово'}
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
        {exercises.map((ex, ei) => {
          const exWarmup = ex.sets.filter((s) => s.isWarmup)
          const exWork = ex.sets.filter((s) => !s.isWarmup)
          return (
            <li key={ex.id}>
              {ex.name}:{' '}
              {exWarmup.length > 0 && (
                <>
                  <span className="text-blue-600 dark:text-blue-400">[</span>
                  {exWarmup.map((s, si) => {
                    // Находим глобальный индекс разминочного подхода
                    let globalIndex = -1
                    let warmupCount = 0
                    for (let i = 0; i < ex.sets.length; i++) {
                      if (ex.sets[i]?.isWarmup) {
                        if (warmupCount === si) {
                          globalIndex = i
                          break
                        }
                        warmupCount++
                      }
                    }
                    const isCurrent = ei === exerciseIndex && globalIndex === setIndex
                    const done = ei < exerciseIndex || (ei === exerciseIndex && globalIndex < setIndex) || s.skipped
                    return (
                      <span key={si} className={isCurrent ? 'font-medium text-blue-800 dark:text-blue-200' : ''}>
                        {done ? (s.skipped ? '—' : '✓') : isCurrent ? '●' : '○'}
                        {si < exWarmup.length - 1 ? ', ' : ''}
                      </span>
                    )
                  })}
                  <span className="text-blue-600 dark:text-blue-400">]</span>
                  {exWork.length > 0 && ' '}
                </>
              )}
              {exWork.map((s, si) => {
                // Находим глобальный индекс рабочего подхода
                let globalIndex = -1
                let workCount = 0
                for (let i = 0; i < ex.sets.length; i++) {
                  if (!ex.sets[i]?.isWarmup) {
                    if (workCount === si) {
                      globalIndex = i
                      break
                    }
                    workCount++
                  }
                }
                const isCurrent = ei === exerciseIndex && globalIndex === setIndex
                const done = ei < exerciseIndex || (ei === exerciseIndex && globalIndex < setIndex) || s.skipped
                return (
                  <span key={si} className={isCurrent ? 'font-medium text-slate-800 dark:text-beefy-dark-text' : ''}>
                    {done ? (s.skipped ? '—' : '✓') : isCurrent ? '●' : '○'}
                    {si < exWork.length - 1 ? ', ' : ''}
                  </span>
                )
              })}
            </li>
          )
        })}
      </ul>
    </div>
    {TechniqueModal}
    </>
  )
}
