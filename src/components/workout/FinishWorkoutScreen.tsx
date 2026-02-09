import { useState, useMemo } from 'react'
import { getNextWeightKg } from '@/data/helenPlan'
import type { ExerciseInWorkout, ExerciseNextWeight, NextWeightChoice } from '@/types'

export interface FinishWorkoutScreenProps {
  workoutName: string
  exercises: ExerciseInWorkout[]
  currentWeights: Record<string, number>
  onSave: (nextWeights: Record<string, number>) => void
}

export function FinishWorkoutScreen({
  workoutName,
  exercises,
  currentWeights,
  onSave,
}: FinishWorkoutScreenProps) {
  const items = useMemo((): ExerciseNextWeight[] => {
    const list: ExerciseNextWeight[] = []
    const seen = new Set<string>()
    for (const ex of exercises) {
      if (ex.durationSec || ex.bodyweight || seen.has(ex.id)) continue
      seen.add(ex.id)
      // Находим первый рабочий подход (не разминочный)
      const workSet = ex.sets.find((s) => !s.isWarmup)
      const current = currentWeights[ex.id] ?? workSet?.weightKg ?? 0
      list.push({
        exerciseId: ex.id,
        exerciseName: ex.name,
        currentWeightKg: current,
        choice: 'same',
        nextWeightKg: current,
      })
    }
    return list
  }, [exercises, currentWeights])

  const [choices, setChoices] = useState<ExerciseNextWeight[]>(items)

  const updateChoice = (index: number, choice: NextWeightChoice) => {
    setChoices((prev) =>
      prev.map((it, i) =>
        i === index
          ? {
              ...it,
              choice,
              nextWeightKg: getNextWeightKg(choice, it.currentWeightKg, it.exerciseId),
            }
          : it
      )
    )
  }

  const handleSave = () => {
    const nextWeights: Record<string, number> = { ...currentWeights }
    for (const it of choices) {
      nextWeights[it.exerciseId] = it.nextWeightKg
    }
    onSave(nextWeights)
  }

  return (
    <div className="space-y-6 min-w-0 w-full max-w-full">
      <div>
        <h2 className="text-lg font-semibold text-beefy-primary dark:text-beefy-dark-text">Тренировка завершена</h2>
        <p className="text-beefy-text-secondary dark:text-beefy-dark-text-muted text-sm">{workoutName}</p>
      </div>
      <p className="text-beefy-text-secondary dark:text-beefy-dark-text-muted text-sm">
        Укажите план на следующую тренировку: делоуд (−10%), оставить вес или добавить.
      </p>
      <ul className="space-y-4">
        {choices.map((it, index) => (
          <li key={it.exerciseId} className="bg-white dark:bg-beefy-dark-bg-card rounded-xl border border-beefy-primary/20 dark:border-beefy-dark-border p-4">
            <p className="font-medium text-beefy-primary dark:text-beefy-dark-text mb-2">{it.exerciseName}</p>
            <p className="text-sm text-beefy-text-secondary dark:text-beefy-dark-text-muted mb-3">
              Сейчас: {it.currentWeightKg} кг → на следующей: {it.nextWeightKg} кг
            </p>
            <div className="flex gap-2 flex-wrap">
              {(['deload', 'same', 'add'] as const).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => updateChoice(index, choice)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    it.choice === choice
                      ? choice === 'deload'
                        ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                        : choice === 'add'
                          ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                          : 'bg-slate-200 dark:bg-beefy-dark-border/50 text-slate-800 dark:text-beefy-dark-text border border-slate-400 dark:border-beefy-dark-border'
                      : 'bg-beefy-cream/60 dark:bg-beefy-dark-bg text-beefy-primary dark:text-beefy-dark-text-muted border border-beefy-primary/20 dark:border-beefy-dark-border hover:bg-beefy-cream dark:hover:bg-beefy-dark-border/30'
                  }`}
                >
                  {choice === 'deload' ? 'Понизить вес' : choice === 'same' ? 'Оставить' : 'Добавить вес'}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={handleSave}
        className="w-full py-3 bg-beefy-primary dark:bg-beefy-accent text-beefy-cream dark:text-white font-semibold rounded-xl hover:opacity-90"
      >
        Сохранить и завершить
      </button>
    </div>
  )
}
