import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import {
  getHistoryByDay,
  getHistoryByWeek,
  MUSCLE_GROUP_NAMES,
} from '@/utils/progressStats'
import { getSchedule, setWorkoutHistory, getBodyMeasurements } from '@/utils/storage'
import { getExerciseNameByIdFromPlan } from '@/data/plans'
import { seedWorkoutHistory } from '@/dev/seedHistory'
import { useTheme } from '@/hooks/useTheme'
import { ProgressHistory } from './ProgressHistory'
import type { MuscleGroupId, BodyMeasurementKey } from '@/types'

const MEASUREMENT_LABELS: Record<BodyMeasurementKey, string> = {
  weight: 'Вес',
  chest: 'Грудь',
  waist: 'Талия',
  hips: 'Бёдра',
  bicep: 'Бицепс',
  thigh: 'Бедро',
}
const MEASUREMENT_KEYS: BodyMeasurementKey[] = ['weight', 'chest', 'waist', 'hips', 'bicep', 'thigh']
function getMeasurementUnit(key: BodyMeasurementKey): string {
  return key === 'weight' ? 'кг' : 'см'
}
function formatDateShort(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export type ProgressSubTab = 'charts' | 'history'

const isDev = import.meta.env.DEV

const COLOR_VOLUME = '#0d9488'
const COLOR_WEIGHT = '#2563eb'
const COLOR_1RM = '#ea580c'
const COLOR_MEASUREMENTS = '#0d9488'

const CHART_MIN_WIDTH = 480
const CHART_HEIGHT = 260
const CHART_MARGIN = { top: 12, right: 40, left: 8, bottom: 24 }

const CHART_LIGHT = {
  grid: '#cbd5e1',
  axis: '#334155',
  cursor: '#475569',
  tooltipBg: '#f8fafc',
}
const CHART_DARK = {
  grid: '#475569',
  axis: '#e2e8f0',
  cursor: '#94a3b8',
  tooltipBg: '#1e293b',
}

function getLastValues(
  data: Record<string, string | number | null>[],
  valueKeys: string[]
): Record<string, number | null> {
  const result: Record<string, number | null> = {}
  for (const key of valueKeys) {
    let last: number | null = null
    for (let i = data.length - 1; i >= 0; i--) {
      const row = data[i]
      const v = row?.[key]
      if (v != null && typeof v === 'number' && v > 0) {
        last = v
        break
      }
    }
    result[key] = last
  }
  return result
}

function formatPeriodDay(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  })
}

function formatPeriodWeek(weekStart: string): string {
  const d = new Date(weekStart + 'T12:00:00')
  const end = new Date(d)
  end.setDate(end.getDate() + 6)
  return `${d.getDate()}.${d.getMonth() + 1} – ${end.getDate()}.${end.getMonth() + 1}`
}

type ViewMode = 'exercise' | 'muscle' | 'measurements'
type PeriodMode = 'workout' | 'week'

export function ProgressPage() {
  const { isDark } = useTheme()
  const [subTab, setSubTab] = useState<ProgressSubTab>('charts')
  const [viewMode, setViewMode] = useState<ViewMode>('exercise')
  const [periodMode, setPeriodMode] = useState<PeriodMode>('workout')
  const [refresh, setRefresh] = useState(0)

  const chartColors = isDark ? CHART_DARK : CHART_LIGHT

  const byDay = useMemo(() => getHistoryByDay(), [refresh])
  const byWeek = useMemo(() => getHistoryByWeek(), [refresh])

  const handleSeedHistory = () => {
    const entries = seedWorkoutHistory()
    setWorkoutHistory(entries)
    setRefresh((r) => r + 1)
  }

  const { chartData, keys, exerciseChartData } = useMemo(() => {
    if (viewMode === 'measurements') {
      const entries = getBodyMeasurements()
        .filter((e) => MEASUREMENT_KEYS.some((k) => (e.values[k] ?? 0) > 0))
        .sort((a, b) => a.date.localeCompare(b.date))
      const chartData = entries.map((e) => ({
        date: e.date,
        period: formatDateShort(e.date),
        _sort: e.date,
        ...e.values,
      }))
      const keysWithData = MEASUREMENT_KEYS.filter((k) => chartData.some((row) => (row[k] ?? 0) > 0))
      return {
        chartData,
        keys: keysWithData.map((id) => ({ id, name: `${MEASUREMENT_LABELS[id]}, ${getMeasurementUnit(id)}` })),
        exerciseChartData: null as Record<string, string | number | null>[] | null,
      }
    }

    const byWorkout = periodMode === 'workout'
    const raw = byWorkout ? byDay : byWeek
    const periodKey = byWorkout ? 'date' : 'weekStart'
    const formatPeriodFn = byWorkout ? formatPeriodDay : formatPeriodWeek
    const dropZeros = byWorkout

    const toVal = (v: number, omitZero: boolean) =>
      (omitZero && v === 0 ? null : v) as number | null

    if (viewMode === 'exercise') {
      const exerciseIds = new Set<string>()
      for (const row of raw) {
        Object.keys(row.byExercise).forEach((id) => exerciseIds.add(id))
      }
      const keyList = Array.from(exerciseIds)
      const sorted = [...raw].sort((a, b) =>
        String(a[periodKey as keyof typeof a]).localeCompare(String(b[periodKey as keyof typeof b]))
      )
      let running1RM: Record<string, number> = {}
      const chartData = sorted.map((row) => {
        const period = String(row[periodKey as keyof typeof row])
        const r: Record<string, string | number | null> = {
          period: formatPeriodFn(period),
          _sort: period,
        }
        for (const id of keyList) {
          const vol = (row.byExercise as Record<string, number>)[id] ?? 0
          r[id] = toVal(vol, dropZeros)
        }
        for (const id of keyList) {
          const day1RM = (row.byExerciseDay1RM as Record<string, number>)?.[id] ?? 0
          running1RM[id] = Math.max(running1RM[id] ?? 0, day1RM)
          const w = (row.byExerciseWeight as Record<string, number>)?.[id] ?? 0
          r[`${id}_weight`] = toVal(w, dropZeros)
          r[`${id}_1rm`] = toVal(running1RM[id] ?? 0, dropZeros)
        }
        return r
      })
      const planId = getSchedule()?.planId ?? ''
      const keys = keyList.map((id) => ({ id, name: getExerciseNameByIdFromPlan(planId, id) }))
      return { chartData, keys, exerciseChartData: chartData }
    }

    const groupIds: MuscleGroupId[] = ['legs', 'back', 'chest', 'shoulders', 'arms', 'core']
    const chartData = raw.map((row) => {
      const periodVal = String(row[periodKey as keyof typeof row])
      const r: Record<string, string | number | null> = {
        period: formatPeriodFn(periodVal),
        _sort: periodVal,
      }
      for (const g of groupIds) {
        const v = (row.byMuscleGroup as Record<string, number>)[g] ?? 0
        r[g] = toVal(v, dropZeros)
      }
      return r
    })
    chartData.sort((a, b) => (a._sort as string).localeCompare(b._sort as string))
    const keysWithData = groupIds.filter((g) =>
      chartData.some((row) => (row[g] as number) > 0)
    )
    return {
      chartData,
      keys: keysWithData.map((id) => ({ id, name: MUSCLE_GROUP_NAMES[id] })),
      exerciseChartData: null as typeof chartData | null,
    }
  }, [viewMode, periodMode, byDay, byWeek])

  const subNav = (
    <div className="flex min-h-[40px] items-stretch rounded-xl bg-beefy-primary/10 dark:bg-beefy-dark-border/30 p-1 w-full sm:w-auto sm:max-w-[240px] mb-4">
      <button
        type="button"
        onClick={() => setSubTab('charts')}
        className={`flex-1 min-h-[36px] rounded-lg text-sm font-medium touch-manipulation transition-colors ${
          subTab === 'charts'
            ? 'bg-beefy-primary dark:bg-beefy-accent text-beefy-cream dark:text-white shadow-sm'
            : 'text-beefy-text-secondary dark:text-beefy-dark-text-muted hover:text-beefy-primary dark:hover:text-beefy-dark-text'
        }`}
      >
        Графики
      </button>
      <button
        type="button"
        onClick={() => setSubTab('history')}
        className={`flex-1 min-h-[36px] rounded-lg text-sm font-medium touch-manipulation transition-colors ${
          subTab === 'history'
            ? 'bg-beefy-primary dark:bg-beefy-accent text-beefy-cream dark:text-white shadow-sm'
            : 'text-beefy-text-secondary dark:text-beefy-dark-text-muted hover:text-beefy-primary dark:hover:text-beefy-dark-text'
        }`}
      >
        История
      </button>
    </div>
  )

  if (subTab === 'history') {
    return (
      <div className="space-y-6 w-full max-w-xl min-w-0">
        {subNav}
        <ProgressHistory />
      </div>
    )
  }

  if (chartData.length === 0) {
    const isMeasurements = viewMode === 'measurements'
    return (
      <div className="space-y-6 w-full max-w-xl min-w-0">
        {subNav}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-600 dark:text-beefy-dark-text-muted text-sm mr-0 w-full sm:w-auto sm:mr-2">Показать:</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setViewMode('exercise')} className="min-h-[44px] px-3 py-2.5 rounded-lg text-sm font-medium touch-manipulation bg-slate-100 dark:bg-beefy-dark-border/30 text-slate-600 dark:text-beefy-dark-text-muted">По упражнениям</button>
            <button type="button" onClick={() => setViewMode('muscle')} className="min-h-[44px] px-3 py-2.5 rounded-lg text-sm font-medium touch-manipulation bg-slate-100 dark:bg-beefy-dark-border/30 text-slate-600 dark:text-beefy-dark-text-muted">По группам мышц</button>
            <button type="button" onClick={() => setViewMode('measurements')} className="min-h-[44px] px-3 py-2.5 rounded-lg text-sm font-medium touch-manipulation bg-slate-100 dark:bg-beefy-dark-border/30 text-slate-600 dark:text-beefy-dark-text-muted">Замеры</button>
          </div>
        </div>
        <div className="py-8 text-center text-slate-500 dark:text-beefy-dark-text-muted space-y-4">
          <div>
            <p className="font-medium">{isMeasurements ? 'Нет данных замеров' : 'Нет данных для графиков'}</p>
            <p className="text-sm mt-1">
              {isMeasurements
                ? 'Добавьте замеры на вкладке «Замеры» — здесь появятся графики изменений.'
                : 'Завершите тренировки и сохраняйте результаты — здесь появится прогрессия по объёму.'}
            </p>
          </div>
          {isDev && !isMeasurements && (
            <button
              type="button"
              onClick={handleSeedHistory}
              className="min-h-[44px] px-4 py-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-sm font-medium border border-amber-300 dark:border-amber-700 touch-manipulation"
            >
              Заполнить историю (dev)
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full max-w-xl min-w-0">
      {subNav}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-slate-600 dark:text-beefy-dark-text-muted text-sm mr-0 w-full sm:w-auto sm:mr-2">Показать:</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setViewMode('exercise')}
            className={`min-h-[44px] px-3 py-2.5 rounded-lg text-sm font-medium touch-manipulation ${
              viewMode === 'exercise' ? 'bg-beefy-cream dark:bg-beefy-accent text-beefy-primary dark:text-white border border-beefy-primary/20 dark:border-transparent' : 'bg-slate-100 dark:bg-beefy-dark-border/30 text-slate-600 dark:text-beefy-dark-text-muted'
            }`}
          >
            По упражнениям
          </button>
          <button
            type="button"
            onClick={() => setViewMode('muscle')}
            className={`min-h-[44px] px-3 py-2.5 rounded-lg text-sm font-medium touch-manipulation ${
              viewMode === 'muscle' ? 'bg-beefy-cream dark:bg-beefy-accent text-beefy-primary dark:text-white border border-beefy-primary/20 dark:border-transparent' : 'bg-slate-100 dark:bg-beefy-dark-border/30 text-slate-600 dark:text-beefy-dark-text-muted'
            }`}
          >
            По группам мышц
          </button>
          <button
            type="button"
            onClick={() => setViewMode('measurements')}
            className={`min-h-[44px] px-3 py-2.5 rounded-lg text-sm font-medium touch-manipulation ${
              viewMode === 'measurements' ? 'bg-beefy-cream dark:bg-beefy-accent text-beefy-primary dark:text-white border border-beefy-primary/20 dark:border-transparent' : 'bg-slate-100 dark:bg-beefy-dark-border/30 text-slate-600 dark:text-beefy-dark-text-muted'
            }`}
          >
            Замеры
          </button>
        </div>
      </div>
      {viewMode !== 'measurements' && (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-slate-600 dark:text-beefy-dark-text-muted text-sm mr-0 w-full sm:w-auto sm:mr-2">Период:</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPeriodMode('workout')}
            className={`min-h-[44px] px-3 py-2.5 rounded-lg text-sm font-medium touch-manipulation ${
              periodMode === 'workout' ? 'bg-beefy-cream dark:bg-beefy-accent text-beefy-primary dark:text-white border border-beefy-primary/20 dark:border-transparent' : 'bg-slate-100 dark:bg-beefy-dark-border/30 text-slate-600 dark:text-beefy-dark-text-muted'
            }`}
          >
            По тренировкам
          </button>
          <button
            type="button"
            onClick={() => setPeriodMode('week')}
            className={`min-h-[44px] px-3 py-2.5 rounded-lg text-sm font-medium touch-manipulation ${
              periodMode === 'week' ? 'bg-beefy-cream dark:bg-beefy-accent text-beefy-primary dark:text-white border border-beefy-primary/20 dark:border-transparent' : 'bg-slate-100 dark:bg-beefy-dark-border/30 text-slate-600 dark:text-beefy-dark-text-muted'
            }`}
          >
            По неделям
          </button>
        </div>
      </div>
      )}

      {chartData.length > 0 && viewMode === 'measurements' && (
        <>
          <p className="text-slate-500 dark:text-beefy-dark-text-muted text-sm">
            Динамика замеров по датам. Свайп по графику — прокрутка.
          </p>
          <div className="space-y-6">
            {keys.map(({ id, name }) => (
              <div
                key={id}
                className="bg-white dark:bg-beefy-dark-bg-card rounded-xl border border-slate-200 dark:border-beefy-dark-border p-3 sm:p-4 w-full"
              >
                <p className="text-slate-700 dark:text-beefy-dark-text font-medium mb-2 text-sm sm:text-base shrink-0">{name}</p>
                <div
                  className="overflow-x-auto overflow-y-hidden -mx-1 px-1"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  <div style={{ minWidth: CHART_MIN_WIDTH, height: CHART_HEIGHT }}>
                    <LineChart
                      width={CHART_MIN_WIDTH}
                      height={CHART_HEIGHT}
                      data={chartData}
                      margin={CHART_MARGIN}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis
                        dataKey="period"
                        tick={{ fontSize: 12, fill: chartColors.axis }}
                        stroke={chartColors.axis}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: chartColors.axis }}
                        stroke={chartColors.axis}
                        width={32}
                      />
                      <Tooltip
                        formatter={(value: unknown) => [
                          value != null ? `${Number(value)} ${getMeasurementUnit(id as BodyMeasurementKey)}` : '—',
                          name,
                        ]}
                        contentStyle={{ fontSize: 13, backgroundColor: chartColors.tooltipBg }}
                        cursor={{ stroke: chartColors.cursor, strokeWidth: 1 }}
                      />
                      <Line
                        type="monotone"
                        dataKey={id}
                        name={name}
                        stroke={COLOR_MEASUREMENTS}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        connectNulls
                      />
                    </LineChart>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {chartData.length > 0 && viewMode !== 'measurements' && (
        <>
          <p className="text-slate-500 dark:text-beefy-dark-text-muted text-sm">
            {viewMode === 'exercise'
              ? 'По каждому упражнению: объём, рабочий вес и 1RM. Свайп по графику — прокрутка.'
              : 'Объём по группам мышц. Свайп по графику — прокрутка.'}
          </p>
          <div className="space-y-6">
            {keys.map(({ id, name }) => {
              const data = viewMode === 'exercise' && exerciseChartData ? exerciseChartData : chartData
              const hasWeight1RM = viewMode === 'exercise'
              const valueKeys = hasWeight1RM ? [id, `${id}_weight`, `${id}_1rm`] : [id]
              const lastValues = getLastValues(data, valueKeys)
              return (
                <div
                  key={id}
                  className="bg-white dark:bg-beefy-dark-bg-card rounded-xl border border-slate-200 dark:border-beefy-dark-border p-3 sm:p-4 w-full"
                >
                  <p className="text-slate-700 dark:text-beefy-dark-text font-medium mb-2 text-sm sm:text-base shrink-0">{name}</p>
                  <div
                    className="overflow-x-auto overflow-y-hidden -mx-1 px-1"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                    <div style={{ minWidth: CHART_MIN_WIDTH, height: CHART_HEIGHT }}>
                      <LineChart
                        width={CHART_MIN_WIDTH}
                        height={CHART_HEIGHT}
                        data={data}
                        margin={CHART_MARGIN}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                        <XAxis
                          dataKey="period"
                          tick={{ fontSize: 12, fill: chartColors.axis }}
                          stroke={chartColors.axis}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          yAxisId="left"
                          tick={{ fontSize: 12, fill: chartColors.axis }}
                          stroke={chartColors.axis}
                          width={32}
                          label={{ value: 'Объём', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: chartColors.axis } }}
                        />
                        {hasWeight1RM && (
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 12, fill: chartColors.axis }}
                            stroke={chartColors.axis}
                            width={36}
                            label={{ value: 'кг', angle: 90, position: 'insideRight', style: { fontSize: 11, fill: chartColors.axis } }}
                          />
                        )}
                        <Tooltip
                          formatter={(value: unknown, name: string) => [
                            value == null ? '—' : name.includes('кг') ? `${Number(value)} кг` : Math.round(Number(value)),
                            name,
                          ]}
                          contentStyle={{ fontSize: 13, backgroundColor: chartColors.tooltipBg }}
                          cursor={{ stroke: chartColors.cursor, strokeWidth: 1 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, color: chartColors.axis }} />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey={id}
                          name="Объём"
                          stroke={COLOR_VOLUME}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                          connectNulls
                        />
                        {hasWeight1RM && (
                          <>
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey={`${id}_weight`}
                              name="Рабочий вес, кг"
                              stroke={COLOR_WEIGHT}
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                              connectNulls
                            />
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey={`${id}_1rm`}
                              name="1RM (эст.), кг"
                              stroke={COLOR_1RM}
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                              connectNulls
                            />
                          </>
                        )}
                      </LineChart>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-beefy-dark-border text-sm text-slate-600 dark:text-beefy-dark-text-muted shrink-0">
                    <p className="font-medium text-slate-500 dark:text-beefy-dark-text-muted mb-1">Последние значения</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {hasWeight1RM ? (
                        <>
                          {lastValues[id] != null && (
                            <span>Объём: <strong className="text-slate-700 dark:text-beefy-dark-text">{Math.round(lastValues[id] ?? 0)}</strong></span>
                          )}
                          {lastValues[`${id}_weight`] != null && (
                            <span>Вес: <strong className="text-slate-700 dark:text-beefy-dark-text">{lastValues[`${id}_weight`]} кг</strong></span>
                          )}
                          {lastValues[`${id}_1rm`] != null && (
                            <span>1RM: <strong className="text-slate-700 dark:text-beefy-dark-text">~{lastValues[`${id}_1rm`]} кг</strong></span>
                          )}
                          {Object.values(lastValues).every((v) => v == null || v === 0) && (
                            <span className="text-slate-400 dark:text-beefy-dark-text-muted">—</span>
                          )}
                        </>
                      ) : (
                        lastValues[id] != null ? (
                          <span>Объём: <strong className="text-slate-700 dark:text-beefy-dark-text">{Math.round(lastValues[id] ?? 0)}</strong></span>
                        ) : (
                          <span className="text-slate-400 dark:text-beefy-dark-text-muted">—</span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
      {isDev && subTab === 'charts' && viewMode !== 'measurements' && (
        <div className="pt-4 border-t border-slate-200 dark:border-beefy-dark-border">
          <button
            type="button"
            onClick={handleSeedHistory}
            className="min-h-[44px] px-4 py-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-sm font-medium border border-amber-300 dark:border-amber-700 touch-manipulation"
          >
            Заполнить историю (dev)
          </button>
        </div>
      )}
    </div>
  )
}
