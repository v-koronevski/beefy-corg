import { useMemo, useState } from 'react'
import { getWorkoutHistory, setWorkoutHistory } from '@/utils/storage'
import type { WorkoutHistoryEntry } from '@/types'

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function ProgressHistory() {
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())
  const [editingSet, setEditingSet] = useState<{
    entryKey: string
    exerciseIndex: number
    setIndex: number
  } | null>(null)
  const [history, setHistory] = useState<WorkoutHistoryEntry[]>(() => {
    const list = getWorkoutHistory()
    return [...list].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 100)
  })

  const toggleEntry = (key: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleUpdateSetWeight = (
    entryKey: string,
    exerciseIndex: number,
    setIndex: number,
    newWeight: number
  ) => {
    const updatedHistory = [...history]
    const entryIndex = updatedHistory.findIndex(
      (e) => `${e.date}-${e.workoutId}` === entryKey
    )
    if (entryIndex === -1) return

    const entry = updatedHistory[entryIndex]!
    const exercise = entry.exercises[exerciseIndex]
    if (!exercise) return

    const updatedSets = [...exercise.sets]
    updatedSets[setIndex] = {
      ...updatedSets[setIndex]!,
      weightKg: newWeight,
    }

    const updatedExercises = [...entry.exercises]
    updatedExercises[exerciseIndex] = {
      ...exercise,
      sets: updatedSets,
    }

    updatedHistory[entryIndex] = {
      ...entry,
      exercises: updatedExercises,
    }

    // Сохраняем всю историю обратно
    const allHistory = getWorkoutHistory()
    const originalIndex = allHistory.findIndex(
      (e) => e.date === entry.date && e.workoutId === entry.workoutId
    )
    if (originalIndex !== -1) {
      allHistory[originalIndex] = updatedHistory[entryIndex]!
      setWorkoutHistory(allHistory)
    }

    setHistory(updatedHistory)
    setEditingSet(null)
  }

  if (history.length === 0) {
    return (
      <div className="py-8 text-center text-beefy-text-secondary dark:text-beefy-dark-text-muted">
        <p className="font-medium">Нет завершённых тренировок</p>
        <p className="text-sm mt-1">Завершайте тренировки — здесь появится история.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 w-full max-w-xl min-w-0">
      <p className="text-sm text-beefy-text-secondary dark:text-beefy-dark-text-muted">
        Последние завершённые тренировки.
      </p>
      <ul className="space-y-2">
        {history.map((entry) => {
          const entryKey = `${entry.date}-${entry.workoutId}`
          const isExpanded = expandedEntries.has(entryKey)
          const completedSets = entry.exercises.reduce(
            (sum, ex) => sum + ex.sets.filter((s) => !s.skipped).length,
            0
          )
          const totalSets = entry.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)

          return (
            <li
              key={entryKey}
              className="bg-white dark:bg-beefy-dark-bg-card rounded-xl border border-beefy-primary/20 dark:border-beefy-dark-border shadow-sm overflow-hidden"
            >
              <div className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-beefy-primary dark:text-beefy-dark-text">
                    {entry.workoutName}
                  </span>
                  <span className="text-sm text-beefy-text-secondary dark:text-beefy-dark-text-muted">
                    {formatDate(entry.date)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-beefy-text-secondary dark:text-beefy-dark-text-muted">
                      {entry.exercises.length} упражнений • {completedSets}/{totalSets} подходов
                    </p>
                    {entry.exercises.some((ex) => ex.notes) && !isExpanded && (
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                        📝
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleEntry(entryKey)}
                    className="text-sm font-medium text-beefy-primary dark:text-beefy-dark-text hover:underline focus:outline-none focus:ring-2 focus:ring-beefy-primary dark:focus:ring-beefy-dark-text rounded px-2 py-1"
                  >
                    {isExpanded ? 'Скрыть детали' : 'Показать детали'}
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-beefy-primary/10 dark:border-beefy-dark-border px-4 pb-4 pt-3 space-y-3">
                  {entry.exercises.map((exercise, exerciseIndex) => {
                    const completedExerciseSets = exercise.sets.filter((s) => !s.skipped)
                    const hasDuration = exercise.sets.some((s) => s.durationSec !== undefined)

                    return (
                      <div key={exercise.id} className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm text-beefy-primary dark:text-beefy-dark-text">
                            {exercise.name}
                            {exercise.notes && (
                              <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">📝</span>
                            )}
                          </h4>
                          <span className="text-xs text-beefy-text-secondary dark:text-beefy-dark-text-muted whitespace-nowrap">
                            {completedExerciseSets.length}/{exercise.sets.length}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {exercise.sets.map((set, idx) => {
                            const isEditing =
                              editingSet?.entryKey === entryKey &&
                              editingSet?.exerciseIndex === exerciseIndex &&
                              editingSet?.setIndex === idx

                            if (set.skipped) {
                              return (
                                <span
                                  key={idx}
                                  className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-beefy-dark-border/30 text-slate-500 dark:text-beefy-dark-text-muted"
                                >
                                  —
                                </span>
                              )
                            }
                            if (hasDuration && set.durationSec) {
                              return (
                                <span
                                  key={idx}
                                  className="text-xs px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 font-medium"
                                >
                                  {set.durationSec} сек
                                </span>
                              )
                            }
                            if (isEditing) {
                              return (
                                <SetWeightEditor
                                  key={idx}
                                  currentWeight={set.weightKg}
                                  reps={set.reps}
                                  onSave={(newWeight) =>
                                    handleUpdateSetWeight(entryKey, exerciseIndex, idx, newWeight)
                                  }
                                  onCancel={() => setEditingSet(null)}
                                />
                              )
                            }
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() =>
                                  setEditingSet({
                                    entryKey,
                                    exerciseIndex,
                                    setIndex: idx,
                                  })
                                }
                                className="text-xs px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
                                title="Нажмите, чтобы изменить вес"
                              >
                                {set.weightKg > 0 ? `${set.weightKg} кг` : 'с.в.'} × {set.reps}
                              </button>
                            )
                          })}
                        </div>
                        {exercise.notes && (
                          <div className="mt-2 pt-2 border-t border-beefy-primary/10 dark:border-beefy-dark-border">
                            <p className="text-xs text-beefy-text-secondary dark:text-beefy-dark-text-muted italic whitespace-pre-wrap">
                              {exercise.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

interface SetWeightEditorProps {
  currentWeight: number
  reps: number
  onSave: (newWeight: number) => void
  onCancel: () => void
}

function SetWeightEditor({ currentWeight, reps, onSave, onCancel }: SetWeightEditorProps) {
  const [weight, setWeight] = useState(String(currentWeight))

  const handleSave = () => {
    const val = parseFloat(weight)
    if (!isNaN(val) && val >= 0) {
      onSave(val)
    } else {
      onCancel()
    }
  }

  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/40 border-2 border-blue-400 dark:border-blue-600">
      <input
        type="number"
        step="0.5"
        min="0"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSave()
          } else if (e.key === 'Escape') {
            onCancel()
          }
        }}
        autoFocus
        className="w-12 px-1 py-0.5 text-xs border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-beefy-dark-bg text-beefy-primary dark:text-beefy-dark-text focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <span className="text-xs text-emerald-800 dark:text-emerald-200">кг</span>
      <span className="text-xs text-emerald-800 dark:text-emerald-200">× {reps}</span>
      <button
        type="button"
        onClick={handleSave}
        className="ml-1 text-xs px-1.5 py-0.5 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700"
        title="Сохранить (Enter)"
      >
        ✓
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-xs px-1.5 py-0.5 bg-slate-400 dark:bg-slate-600 text-white rounded hover:bg-slate-500 dark:hover:bg-slate-700"
        title="Отмена (Esc)"
      >
        ×
      </button>
    </div>
  )
}
