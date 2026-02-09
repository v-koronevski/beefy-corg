import { useTheme } from '@/hooks/useTheme'
import { resetAppData, resetProgram } from '@/utils/storage'
import type { ThemeId } from '@/utils/storage'
import { ExerciseSettingsEditor } from './ExerciseSettingsEditor'

const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'light', label: 'Светлая' },
  { id: 'dark', label: 'Тёмная' },
  { id: 'system', label: 'Как в системе' },
]

export function SettingsPage() {
  const { theme, setTheme } = useTheme()

  const handleResetProgram = () => {
    if (
      !window.confirm(
        'Сбросить программу тренировок? Будут удалены планы, расписание, веса и настройки упражнений. История тренировок и замеры сохранятся. Приложение откроется заново для настройки.'
      )
    ) {
      return
    }
    resetProgram()
    window.location.reload()
  }

  const handleResetAll = () => {
    if (
      !window.confirm(
        'Сбросить ВСЕ данные? Будут удалены планы, расписание, веса, история тренировок и замеры. Приложение откроется заново для настройки.'
      )
    ) {
      return
    }
    resetAppData()
    window.location.reload()
  }

  return (
    <div className="space-y-6 w-full max-w-xl min-w-0">
      <h2 className="text-lg font-semibold text-beefy-primary dark:text-beefy-dark-text">Настройки</h2>
      <section className="bg-white dark:bg-beefy-dark-bg-card rounded-xl border border-beefy-primary/20 dark:border-beefy-dark-border p-4 shadow-sm">
        <h3 className="text-beefy-primary dark:text-beefy-dark-text font-medium mb-3">Тема</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          {THEMES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTheme(id)}
              className={`min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium touch-manipulation ${
                theme === id
                  ? 'bg-beefy-primary dark:bg-beefy-accent text-beefy-cream dark:text-white'
                  : 'bg-beefy-cream/50 dark:bg-beefy-dark-border/30 text-beefy-primary dark:text-beefy-dark-text-muted hover:bg-beefy-cream dark:hover:bg-beefy-dark-border/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
      <section className="bg-white dark:bg-beefy-dark-bg-card rounded-xl border border-beefy-primary/20 dark:border-beefy-dark-border p-4 shadow-sm">
        <h3 className="text-beefy-primary dark:text-beefy-dark-text font-medium mb-3">Тренировки</h3>
        <ExerciseSettingsEditor />
      </section>
      <section className="bg-white dark:bg-beefy-dark-bg-card rounded-xl border border-beefy-primary/20 dark:border-beefy-dark-border p-4 shadow-sm">
        <h3 className="text-beefy-primary dark:text-beefy-dark-text font-medium mb-3">Данные</h3>
        <div className="space-y-4">
          <div>
            <p className="text-beefy-text-secondary dark:text-beefy-dark-text-muted text-sm mb-2">
              Сбросить только программу тренировок. История тренировок и замеры сохранятся.
            </p>
            <button
              type="button"
              onClick={handleResetProgram}
              className="min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium touch-manipulation bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-900/60 w-full sm:w-auto"
            >
              Сбросить программу
            </button>
          </div>
          <div className="pt-3 border-t border-beefy-primary/10 dark:border-beefy-dark-border">
            <p className="text-beefy-text-secondary dark:text-beefy-dark-text-muted text-sm mb-2">
              Сбросить все данные, включая историю тренировок и замеры.
            </p>
            <button
              type="button"
              onClick={handleResetAll}
              className="min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium touch-manipulation bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-900/60 w-full sm:w-auto"
            >
              Сбросить все данные
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
