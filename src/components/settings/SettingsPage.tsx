import { useState } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { exportAppData, importAppData, resetAppData, resetProgram } from '@/utils/storage'
import type { ThemeId } from '@/utils/storage'
import { ExerciseSettingsEditor } from './ExerciseSettingsEditor'

const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'light', label: 'Светлая' },
  { id: 'dark', label: 'Тёмная' },
  { id: 'system', label: 'Как в системе' },
]

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [exportJson, setExportJson] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [copyDone, setCopyDone] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)

  const handleExport = () => {
    setExportJson(exportAppData())
    setCopyDone(false)
    setCopyError(null)
  }

  const handleCopyExport = async () => {
    if (!exportJson) return
    try {
      await navigator.clipboard.writeText(exportJson)
      setCopyDone(true)
      setCopyError(null)
    } catch {
      setCopyError('Не удалось скопировать')
    }
  }

  const handleImport = () => {
    setImportError(null)
    const result = importAppData(importText)
    if (result.success) {
      setImportOpen(false)
      setImportText('')
      window.location.reload()
    } else {
      setImportError(result.error ?? 'Ошибка импорта')
    }
  }

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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium touch-manipulation bg-beefy-primary dark:bg-beefy-accent text-beefy-cream dark:text-white hover:opacity-90"
            >
              Экспорт данных
            </button>
            <button
              type="button"
              onClick={() => { setImportOpen(true); setImportText(''); setImportError(null) }}
              className="min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium touch-manipulation bg-beefy-cream/50 dark:bg-beefy-dark-border/30 text-beefy-primary dark:text-beefy-dark-text border border-beefy-primary/20 dark:border-beefy-dark-border hover:bg-beefy-cream dark:hover:bg-beefy-dark-border/50"
            >
              Импорт данных
            </button>
          </div>
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

      {/* Модалка экспорта: JSON и кнопка «Скопировать» */}
      {exportJson !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setExportJson(null)}>
          <div className="bg-white dark:bg-beefy-dark-bg-card rounded-xl border border-beefy-primary/20 dark:border-beefy-dark-border shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col p-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-beefy-primary dark:text-beefy-dark-text font-medium mb-2">Экспорт данных</h3>
            <p className="text-beefy-text-secondary dark:text-beefy-dark-text-muted text-sm mb-2">Скопируйте строку ниже и сохраните в надёжном месте.</p>
            <textarea
              readOnly
              value={exportJson}
              className="flex-1 min-h-[120px] w-full p-3 rounded-lg border border-beefy-primary/20 dark:border-beefy-dark-border bg-beefy-cream/30 dark:bg-beefy-dark-bg text-beefy-primary dark:text-beefy-dark-text text-sm font-mono"
              rows={8}
            />
            {copyError && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{copyError}</p>}
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={handleCopyExport}
                className="min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium bg-beefy-primary dark:bg-beefy-accent text-beefy-cream dark:text-white"
              >
                {copyDone ? 'Скопировано' : 'Скопировать'}
              </button>
              <button
                type="button"
                onClick={() => { setExportJson(null); setCopyError(null) }}
                className="min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium bg-beefy-cream/50 dark:bg-beefy-dark-border/30 text-beefy-primary dark:text-beefy-dark-text"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка импорта: вставка строки и кнопки Импорт / Отмена */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setImportOpen(false)}>
          <div className="bg-white dark:bg-beefy-dark-bg-card rounded-xl border border-beefy-primary/20 dark:border-beefy-dark-border shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col p-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-beefy-primary dark:text-beefy-dark-text font-medium mb-2">Импорт данных</h3>
            <p className="text-beefy-text-secondary dark:text-beefy-dark-text-muted text-sm mb-2">Вставьте ранее сохранённую JSON-строку. Текущие данные будут заменены.</p>
            <textarea
              value={importText}
              onChange={e => { setImportText(e.target.value); setImportError(null) }}
              placeholder='{"workout_plans":[...], ...}'
              className="flex-1 min-h-[120px] w-full p-3 rounded-lg border border-beefy-primary/20 dark:border-beefy-dark-border bg-beefy-cream/30 dark:bg-beefy-dark-bg text-beefy-primary dark:text-beefy-dark-text text-sm font-mono"
              rows={8}
            />
            {importError && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{importError}</p>}
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={handleImport}
                className="min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium bg-beefy-primary dark:bg-beefy-accent text-beefy-cream dark:text-white"
              >
                Импорт
              </button>
              <button
                type="button"
                onClick={() => { setImportOpen(false); setImportText(''); setImportError(null) }}
                className="min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium bg-beefy-cream/50 dark:bg-beefy-dark-border/30 text-beefy-primary dark:text-beefy-dark-text"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
