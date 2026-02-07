import { useState, useMemo } from 'react'
import type { WorkoutPlan } from '@/types'

interface OnboardingWeightsProps {
  exerciseIds: string[]
  plan: WorkoutPlan
  onComplete: (weights: Record<string, number>) => void
}

function buildNameMap(plan: WorkoutPlan): Record<string, string> {
  const map: Record<string, string> = {}
  for (const w of plan.workouts) {
    for (const e of w.exercises) {
      map[e.id] = e.name
    }
  }
  return map
}

export function OnboardingWeights({ exerciseIds, plan, onComplete }: OnboardingWeightsProps) {
  const nameMap = useMemo(() => buildNameMap(plan), [plan])
  const [weights, setWeights] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    for (const id of exerciseIds) init[id] = 0
    return init
  })

  const handleChange = (id: string, value: string) => {
    const num = value === '' ? 0 : parseFloat(value)
    if (Number.isNaN(num)) return
    setWeights((prev) => ({ ...prev, [id]: num }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onComplete(weights)
  }

  return (
    <div className="max-w-md mx-auto py-6 px-4 w-full min-w-0">
      <h2 className="text-lg sm:text-xl font-semibold text-beefy-primary dark:text-beefy-dark-text mb-2">Стартовые веса</h2>
      <p className="text-beefy-text-secondary dark:text-beefy-dark-text-muted text-sm mb-6">
        Укажите рабочие веса (кг) для каждого упражнения. Для упражнений без веса (планка, пресс) можно оставить 0.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        {exerciseIds.map((id) => (
          <div key={id} className="flex items-center justify-between gap-3 min-h-[48px]">
            <label className="text-beefy-primary dark:text-beefy-dark-text flex-1 min-w-0 text-sm sm:text-base" htmlFor={id}>
              {nameMap[id] ?? id}
            </label>
            <input
              id={id}
              type="number"
              min={0}
              step={0.5}
              inputMode="decimal"
              className="w-20 min-h-[44px] rounded border border-beefy-primary/30 dark:border-beefy-dark-border bg-white dark:bg-beefy-dark-bg-card text-beefy-primary dark:text-beefy-dark-text px-3 py-2 text-right text-base touch-manipulation"
              value={weights[id] === 0 ? '' : weights[id]}
              onChange={(e) => handleChange(id, e.target.value)}
            />
            <span className="text-beefy-text-secondary dark:text-beefy-dark-text-muted text-sm w-7 shrink-0">кг</span>
          </div>
        ))}
        <button
          type="submit"
          className="w-full mt-6 min-h-[48px] py-3 bg-beefy-primary dark:bg-beefy-accent text-beefy-cream dark:text-white font-medium rounded-lg hover:opacity-90 active:opacity-80 touch-manipulation"
        >
          Начать
        </button>
      </form>
    </div>
  )
}
