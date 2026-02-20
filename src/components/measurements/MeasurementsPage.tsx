import { useState, useEffect } from 'react'
import { getBodyMeasurements, addBodyMeasurement, setBodyMeasurements, getTodayDateString } from '@/utils/storage'
import { seedBodyMeasurements } from '@/dev/seedHistory'
import type { BodyMeasurementKey, BodyMeasurementEntry } from '@/types'

const isDev = import.meta.env.DEV

const MEASUREMENT_LABELS: Record<BodyMeasurementKey, string> = {
  weight: 'Вес',
  chest: 'Грудь',
  waist: 'Талия',
  hips: 'Бёдра',
  bicep: 'Бицепс',
  thigh: 'Бедро',
}

const MEASUREMENT_KEYS: BodyMeasurementKey[] = ['weight', 'chest', 'waist', 'hips', 'bicep', 'thigh']

function getUnit(key: BodyMeasurementKey): string {
  return key === 'weight' ? 'кг' : 'см'
}

function getLastMeasurementValues(): Partial<Record<BodyMeasurementKey, number>> {
  const list = getBodyMeasurements()
  if (list.length === 0) return {}
  const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date))
  return sorted[0]?.values ?? {}
}

function lastValuesToStrings(): Partial<Record<BodyMeasurementKey, string>> {
  const last = getLastMeasurementValues()
  const out: Partial<Record<BodyMeasurementKey, string>> = {}
  for (const k of MEASUREMENT_KEYS) {
    const v = last[k]
    out[k] = v != null ? String(v) : ''
  }
  return out
}

export function MeasurementsPage() {
  const [entries, setEntries] = useState<BodyMeasurementEntry[]>(() => getBodyMeasurements())
  const [date, setDate] = useState(getTodayDateString())
  const [valueStrings, setValueStrings] = useState<Partial<Record<BodyMeasurementKey, string>>>(lastValuesToStrings)
  const [savedMessageVisible, setSavedMessageVisible] = useState(false)

  const refresh = () => setEntries(getBodyMeasurements())

  useEffect(() => {
    if (!savedMessageVisible) return
    const t = setTimeout(() => setSavedMessageVisible(false), 3000)
    return () => clearTimeout(t)
  }, [savedMessageVisible])

  const handleSeedMeasurements = () => {
    const seeded = seedBodyMeasurements()
    setBodyMeasurements(seeded)
    refresh()
  }

  const handleDeleteMeasurement = (dateToDelete: string) => {
    if (!window.confirm('Удалить замер от этой даты?')) return
    const filtered = entries.filter((e) => e.date !== dateToDelete)
    setBodyMeasurements(filtered)
    refresh()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const values: Partial<Record<BodyMeasurementKey, number>> = {}
    for (const k of MEASUREMENT_KEYS) {
      const s = valueStrings[k]?.trim()
      if (s === '') continue
      const v = parseFloat(s!.replace(',', '.'))
      if (!Number.isNaN(v) && v >= 0) values[k] = v
    }
    const hasAny = MEASUREMENT_KEYS.some((k) => values[k] != null && values[k]! > 0)
    if (!hasAny) return
    addBodyMeasurement({ date, values })
    setDate(getTodayDateString())
    refresh()
    setValueStrings(lastValuesToStrings())
    setSavedMessageVisible(true)
  }

  return (
    <div className="space-y-6 w-full max-w-xl min-w-0">
      {savedMessageVisible && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 flex items-center gap-2">
          <span className="text-emerald-600 dark:text-emerald-400 text-lg" aria-hidden>✓</span>
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Замеры сохранены</p>
        </div>
      )}
      <section className="bg-white dark:bg-beefy-dark-bg-card rounded-xl border border-beefy-primary/20 dark:border-beefy-dark-border p-4 shadow-sm min-w-0">
        <h2 className="text-lg font-semibold text-beefy-primary dark:text-beefy-dark-text mb-4">Добавить замер</h2>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-beefy-text-secondary dark:text-beefy-dark-text-muted mb-1">Дата</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full max-w-full min-h-[48px] rounded-lg border border-beefy-primary/30 dark:border-beefy-dark-border bg-white dark:bg-beefy-dark-bg text-beefy-primary dark:text-beefy-dark-text px-3 py-2 box-border touch-manipulation"
              style={{ minHeight: 48 }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {MEASUREMENT_KEYS.map((key) => (
              <div key={key}>
                <label className="block text-sm font-medium text-beefy-text-secondary dark:text-beefy-dark-text-muted mb-1">
                  {MEASUREMENT_LABELS[key]}, {getUnit(key)}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  value={valueStrings[key] ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value
                    if (raw === '' || /^[0-9]*[,.]?[0-9]*$/.test(raw)) {
                      setValueStrings((prev) => ({ ...prev, [key]: raw }))
                    }
                  }}
                  className="w-full min-h-[44px] rounded-lg border border-beefy-primary/30 dark:border-beefy-dark-border bg-white dark:bg-beefy-dark-bg text-beefy-primary dark:text-beefy-dark-text px-3 py-2 text-right"
                />
              </div>
            ))}
          </div>
          <button
            type="submit"
            className="w-full min-h-[44px] py-2.5 bg-beefy-primary dark:bg-beefy-accent text-beefy-cream dark:text-white font-medium rounded-lg hover:opacity-90 active:opacity-80 touch-manipulation"
          >
            Сохранить
          </button>
        </form>
      </section>

      {entries.length > 0 && (
        <section className="bg-white dark:bg-beefy-dark-bg-card rounded-xl border border-beefy-primary/20 dark:border-beefy-dark-border p-4 shadow-sm min-w-0">
          <h2 className="text-lg font-semibold text-beefy-primary dark:text-beefy-dark-text mb-4">Предыдущие замеры</h2>
          <ul className="space-y-3">
            {[...entries]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((entry) => (
                <li
                  key={entry.date}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-beefy-primary/10 dark:border-beefy-dark-border last:border-b-0"
                >
                  <div className="text-sm text-beefy-primary dark:text-beefy-dark-text min-w-0 flex-1">
                    <span className="font-medium">
                      {new Date(entry.date + 'T12:00:00').toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-beefy-text-secondary dark:text-beefy-dark-text-muted ml-2">
                      {MEASUREMENT_KEYS.filter((k) => entry.values[k] != null && entry.values[k]! > 0)
                        .map((k) => `${MEASUREMENT_LABELS[k]}: ${entry.values[k]} ${getUnit(k)}`)
                        .join(', ')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteMeasurement(entry.date)}
                    className="shrink-0 min-h-[36px] px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 touch-manipulation"
                    aria-label="Удалить замер"
                  >
                    Удалить
                  </button>
                </li>
              ))}
          </ul>
        </section>
      )}

      {entries.length === 0 && (
        <div className="text-center text-beefy-text-secondary dark:text-beefy-dark-text-muted text-sm py-8 space-y-4">
          <p>Добавьте первый замер. Графики изменений — на вкладке «Прогресс» → Замеры.</p>
          {isDev && (
            <button
              type="button"
              onClick={handleSeedMeasurements}
              className="min-h-[44px] px-4 py-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-sm font-medium border border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-900/60 touch-manipulation"
            >
              Заполнить замеры (dev)
            </button>
          )}
        </div>
      )}

      {isDev && entries.length > 0 && (
        <div className="pt-4 border-t border-beefy-primary/20 dark:border-beefy-dark-border">
          <button
            type="button"
            onClick={handleSeedMeasurements}
            className="min-h-[44px] px-4 py-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-sm font-medium border border-amber-300 dark:border-amber-700 touch-manipulation"
          >
            Заполнить замеры заново (dev)
          </button>
        </div>
      )}
    </div>
  )
}
