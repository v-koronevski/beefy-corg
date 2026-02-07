import { useMemo } from 'react'
import { getWorkoutHistory } from '@/utils/storage'

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function ProgressHistory() {
  const history = useMemo(() => {
    const list = getWorkoutHistory()
    return [...list].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 100)
  }, [])

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
        {history.map((entry) => (
          <li
            key={`${entry.date}-${entry.workoutId}`}
            className="bg-white dark:bg-beefy-dark-bg-card rounded-xl border border-beefy-primary/20 dark:border-beefy-dark-border p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-beefy-primary dark:text-beefy-dark-text">
                {entry.workoutName}
              </span>
              <span className="text-sm text-beefy-text-secondary dark:text-beefy-dark-text-muted">
                {formatDate(entry.date)}
              </span>
            </div>
            <p className="text-sm text-beefy-text-secondary dark:text-beefy-dark-text-muted mt-1">
              {entry.exercises.length} упражнений
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
