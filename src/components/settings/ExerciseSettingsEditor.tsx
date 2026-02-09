import { useState, useMemo } from 'react'
import { getPlans, getSchedule, getNextWeights, setNextWeights } from '@/utils/storage'
import { getExerciseSettings, setExerciseSettings } from '@/utils/storage'
import type { ExerciseSettings } from '@/types'

export function ExerciseSettingsEditor() {
  const plans = getPlans()
  const schedule = getSchedule()
  const [settings, setSettings] = useState(() => getExerciseSettings())
  const [weights, setWeights] = useState(() => (schedule ? getNextWeights(schedule.planId) : {}))
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null)
  const [editingExercise, setEditingExercise] = useState<{ planId: string; workoutId: string; exerciseId: string } | null>(null)

  const currentPlan = useMemo(() => {
    if (!schedule) return null
    return plans.find((p) => p.id === schedule.planId)
  }, [plans, schedule])

  if (!currentPlan) {
    return (
      <div className="text-sm text-beefy-text-secondary dark:text-beefy-dark-text-muted">
        Нет активного плана тренировок
      </div>
    )
  }

  const handleSaveExercise = (exerciseId: string, newSettings: ExerciseSettings | null, newWeight?: number) => {
    const updated = { ...settings }
    if (newSettings === null || Object.keys(newSettings).length === 0) {
      delete updated[exerciseId]
    } else {
      updated[exerciseId] = newSettings
    }
    setSettings(updated)
    setExerciseSettings(updated)
    
    // Сохраняем вес, если он был изменен
    if (newWeight !== undefined && schedule) {
      const updatedWeights = { ...weights }
      if (newWeight > 0) {
        updatedWeights[exerciseId] = newWeight
      } else {
        delete updatedWeights[exerciseId]
      }
      setWeights(updatedWeights)
      setNextWeights(schedule.planId, updatedWeights)
    }
    
    setEditingExercise(null)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-beefy-text-secondary dark:text-beefy-dark-text-muted">
        Настройте шаг изменения веса, подходы, повторения и текущий рабочий вес для каждого упражнения. Если не задано — используются значения из плана.
      </p>
      {currentPlan.workouts.map((workout) => {
        const isExpanded = expandedWorkout === workout.id
        return (
          <div
            key={workout.id}
            className="bg-white dark:bg-beefy-dark-bg-card rounded-xl border border-beefy-primary/20 dark:border-beefy-dark-border overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpandedWorkout(isExpanded ? null : workout.id)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-beefy-cream/30 dark:hover:bg-beefy-dark-border/20 transition-colors"
            >
              <span className="font-medium text-beefy-primary dark:text-beefy-dark-text">{workout.name}</span>
              <span className="text-sm text-beefy-text-secondary dark:text-beefy-dark-text-muted">
                {workout.exercises.length} упражнений
              </span>
            </button>
            {isExpanded && (
              <div className="border-t border-beefy-primary/10 dark:border-beefy-dark-border px-4 py-3 space-y-3">
                {workout.exercises.map((exercise) => {
                  const exerciseSettings = settings[exercise.id]
                  const currentWeight = weights[exercise.id]
                  const isEditing = editingExercise?.exerciseId === exercise.id
                  const isBodyweight = exercise.bodyweight || exercise.durationSec
                  return (
                    <div key={exercise.id} className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-beefy-primary dark:text-beefy-dark-text">
                            {exercise.name}
                          </h4>
                          <div className="text-xs text-beefy-text-secondary dark:text-beefy-dark-text-muted mt-0.5">
                            План: {exercise.sets}×{exercise.durationSec ? `${exercise.durationSec} сек` : exercise.reps}
                            {exerciseSettings && (
                              <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                                • Настроено: {exerciseSettings.sets ?? exercise.sets}×
                                {exerciseSettings.durationSec
                                  ? `${exerciseSettings.durationSec} сек`
                                  : exerciseSettings.reps ?? exercise.reps}
                              </span>
                            )}
                            {!isBodyweight && currentWeight !== undefined && (
                              <span className="ml-2 text-blue-600 dark:text-blue-400">
                                • Вес: {currentWeight} кг
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingExercise(
                              isEditing ? null : { planId: currentPlan.id, workoutId: workout.id, exerciseId: exercise.id }
                            )
                          }
                          className="text-xs px-3 py-1.5 rounded-lg border border-beefy-primary/20 dark:border-beefy-dark-border text-beefy-primary dark:text-beefy-dark-text hover:bg-beefy-cream/50 dark:hover:bg-beefy-dark-border/30"
                        >
                          {isEditing ? 'Отмена' : exerciseSettings || (!isBodyweight && currentWeight !== undefined) ? 'Изменить' : 'Настроить'}
                        </button>
                      </div>
                      {isEditing && (
                        <ExerciseEditForm
                          exercise={exercise}
                          currentSettings={exerciseSettings}
                          currentWeight={currentWeight}
                          onSave={(newSettings, newWeight) => handleSaveExercise(exercise.id, newSettings, newWeight)}
                          onCancel={() => setEditingExercise(null)}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface ExerciseEditFormProps {
  exercise: { id: string; name: string; sets: number; reps: number; durationSec?: number; bodyweight?: boolean }
  currentSettings: ExerciseSettings | undefined
  currentWeight: number | undefined
  onSave: (settings: ExerciseSettings | null, weight?: number) => void
  onCancel: () => void
}

function ExerciseEditForm({ exercise, currentSettings, currentWeight, onSave, onCancel }: ExerciseEditFormProps) {
  const [addStepKg, setAddStepKg] = useState(String(currentSettings?.addStepKg ?? ''))
  const [deloadStepKg, setDeloadStepKg] = useState(String(currentSettings?.deloadStepKg ?? ''))
  const [sets, setSets] = useState(String(currentSettings?.sets ?? exercise.sets))
  const [reps, setReps] = useState(String(currentSettings?.reps ?? exercise.reps))
  const [durationSec, setDurationSec] = useState(String(currentSettings?.durationSec ?? exercise.durationSec ?? ''))
  const [weight, setWeight] = useState(String(currentWeight ?? ''))
  const isBodyweight = exercise.bodyweight || exercise.durationSec

  const handleSave = () => {
    const newSettings: ExerciseSettings = {}
    if (addStepKg.trim()) {
      const val = parseFloat(addStepKg)
      if (!isNaN(val) && val > 0) newSettings.addStepKg = val
    }
    if (deloadStepKg.trim()) {
      const val = parseFloat(deloadStepKg)
      if (!isNaN(val) && val > 0) newSettings.deloadStepKg = val
    }
    if (sets.trim()) {
      const val = parseInt(sets, 10)
      if (!isNaN(val) && val > 0 && val !== exercise.sets) newSettings.sets = val
    }
    if (exercise.durationSec) {
      if (durationSec.trim()) {
        const val = parseInt(durationSec, 10)
        if (!isNaN(val) && val > 0 && val !== exercise.durationSec) newSettings.durationSec = val
      }
    } else {
      if (reps.trim()) {
        const val = parseInt(reps, 10)
        if (!isNaN(val) && val > 0 && val !== exercise.reps) newSettings.reps = val
      }
    }
    
    // Обрабатываем вес
    let newWeight: number | undefined = undefined
    if (!isBodyweight && weight.trim()) {
      const val = parseFloat(weight)
      if (!isNaN(val) && val >= 0) {
        newWeight = val
      }
    } else if (!isBodyweight && currentWeight !== undefined && !weight.trim()) {
      // Если поле очищено, удаляем вес
      newWeight = 0
    }
    
    onSave(Object.keys(newSettings).length > 0 ? newSettings : null, newWeight)
  }

  const handleReset = () => {
    setAddStepKg('')
    setDeloadStepKg('')
    setSets(String(exercise.sets))
    setReps(String(exercise.reps))
    setDurationSec(String(exercise.durationSec ?? ''))
    setWeight('')
    onSave(null, isBodyweight ? undefined : 0)
  }

  return (
    <div className="bg-beefy-cream/30 dark:bg-beefy-dark-border/20 rounded-lg p-3 space-y-3 border border-beefy-primary/10 dark:border-beefy-dark-border">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-beefy-text-secondary dark:text-beefy-dark-text-muted mb-1">
            Шаг увеличения (кг)
          </label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            value={addStepKg}
            onChange={(e) => setAddStepKg(e.target.value)}
            placeholder="2.5"
            className="w-full px-2 py-1.5 text-sm border border-beefy-primary/20 dark:border-beefy-dark-border rounded-lg bg-white dark:bg-beefy-dark-bg text-beefy-primary dark:text-beefy-dark-text"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-beefy-text-secondary dark:text-beefy-dark-text-muted mb-1">
            Шаг уменьшения (кг)
          </label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            value={deloadStepKg}
            onChange={(e) => setDeloadStepKg(e.target.value)}
            placeholder="10%"
            className="w-full px-2 py-1.5 text-sm border border-beefy-primary/20 dark:border-beefy-dark-border rounded-lg bg-white dark:bg-beefy-dark-bg text-beefy-primary dark:text-beefy-dark-text"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-beefy-text-secondary dark:text-beefy-dark-text-muted mb-1">
            Подходы
          </label>
          <input
            type="number"
            min="1"
            value={sets}
            onChange={(e) => setSets(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-beefy-primary/20 dark:border-beefy-dark-border rounded-lg bg-white dark:bg-beefy-dark-bg text-beefy-primary dark:text-beefy-dark-text"
          />
        </div>
        {exercise.durationSec ? (
          <div>
            <label className="block text-xs font-medium text-beefy-text-secondary dark:text-beefy-dark-text-muted mb-1">
              Время (сек)
            </label>
            <input
              type="number"
              min="1"
              value={durationSec}
              onChange={(e) => setDurationSec(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-beefy-primary/20 dark:border-beefy-dark-border rounded-lg bg-white dark:bg-beefy-dark-bg text-beefy-primary dark:text-beefy-dark-text"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-beefy-text-secondary dark:text-beefy-dark-text-muted mb-1">
              Повторения
            </label>
            <input
              type="number"
              min="1"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-beefy-primary/20 dark:border-beefy-dark-border rounded-lg bg-white dark:bg-beefy-dark-bg text-beefy-primary dark:text-beefy-dark-text"
            />
          </div>
        )}
      </div>
      {!isBodyweight && (
        <div>
          <label className="block text-xs font-medium text-beefy-text-secondary dark:text-beefy-dark-text-muted mb-1">
            Текущий рабочий вес (кг)
          </label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={currentWeight !== undefined ? String(currentWeight) : 'Не задан'}
            className="w-full px-2 py-1.5 text-sm border border-beefy-primary/20 dark:border-beefy-dark-border rounded-lg bg-white dark:bg-beefy-dark-bg text-beefy-primary dark:text-beefy-dark-text"
          />
          <p className="text-xs text-beefy-text-secondary dark:text-beefy-dark-text-muted mt-1">
            Оставьте пустым, чтобы удалить вес
          </p>
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 px-3 py-2 text-sm font-medium bg-beefy-primary dark:bg-beefy-accent text-beefy-cream dark:text-white rounded-lg hover:opacity-90"
        >
          Сохранить
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="px-3 py-2 text-sm font-medium border border-beefy-primary/20 dark:border-beefy-dark-border text-beefy-primary dark:text-beefy-dark-text rounded-lg hover:bg-beefy-cream/50 dark:hover:bg-beefy-dark-border/30"
        >
          Сбросить
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 text-sm font-medium border border-beefy-primary/20 dark:border-beefy-dark-border text-beefy-primary dark:text-beefy-dark-text rounded-lg hover:bg-beefy-cream/50 dark:hover:bg-beefy-dark-border/30"
        >
          Отмена
        </button>
      </div>
    </div>
  )
}
