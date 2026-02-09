import { useMemo, useState, useCallback, useEffect } from 'react'
import {
  getSchedule,
  getNextWeights,
  setNextWeights,
  isOnboardingCompleted,
  setOnboardingCompleted,
  setPlans,
  setSchedule,
  addWorkoutHistoryEntry,
  getTodayDateString,
  migrateDataIfNeeded,
} from '@/utils/storage'
import { getPlanById, VALENTIN_PLAN_ID } from '@/data/plans'
import { getHelenAllExerciseIds, getNextWeightKg } from '@/data/helenPlan'
import { getValentinAllExerciseIds } from '@/data/valentinPlan'
import { HELEN_SCHEDULE } from '@/data/helenPlan'
import { VALENTIN_SCHEDULE } from '@/data/valentinPlan'
import type { ScheduleDay } from '@/types'
import type { UpcomingWorkoutItem } from '@/types'
import { UpcomingWorkouts } from '@/components/workout/UpcomingWorkouts'
import { OnboardingProgramChoice } from '@/components/onboarding/OnboardingProgramChoice'
import { OnboardingWeights } from '@/components/onboarding/OnboardingWeights'
import { ActiveWorkoutView } from '@/components/workout/ActiveWorkoutView'
import { ProgressPage } from '@/components/progress/ProgressPage'
import { MeasurementsPage } from '@/components/measurements/MeasurementsPage'
import { SettingsPage } from '@/components/settings/SettingsPage'
import type { ExerciseRating } from '@/components/workout/ActiveWorkoutView'

function cloneExercises(exercises: UpcomingWorkoutItem['exercises']) {
  return exercises.map((ex) => ({
    ...ex,
    sets: ex.sets.map((s) => ({ ...s })),
  }))
}

export default function App() {
  // Миграция данных при загрузке приложения
  useEffect(() => {
    migrateDataIfNeeded()
  }, [])
  
  const [onboardingDone, setOnboardingDone] = useState(isOnboardingCompleted)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const schedule = useMemo(() => getSchedule(), [onboardingDone])
  const hasSchedule = !!schedule && !!schedule.planId

  const [activeWorkout, setActiveWorkout] = useState<{
    workoutId: string
    workoutName: string
    exercises: ReturnType<typeof cloneExercises>
  } | null>(null)
  const [mainTab, setMainTab] = useState<'workouts' | 'progress' | 'measurements' | 'settings'>('workouts')

  const isSettingsOpen = mainTab === 'settings'

  const handleOnboardingComplete = (planId: string, weights: Record<string, number>) => {
    const plan = getPlanById(planId)
    if (!plan) return
    setNextWeights(planId, weights)
    setPlans([plan])
    setSchedule({
      planId,
      byDay: (planId === VALENTIN_PLAN_ID ? VALENTIN_SCHEDULE : HELEN_SCHEDULE) as Record<ScheduleDay, string>,
    })
    setOnboardingCompleted()
    setSelectedPlanId(null)
    setOnboardingDone(true)
  }

  const handleStartWorkout = useCallback((item: UpcomingWorkoutItem) => {
    setActiveWorkout({
      workoutId: item.workoutId,
      workoutName: item.workoutName,
      exercises: cloneExercises(item.exercises),
    })
  }, [])

  const handleWorkoutComplete = useCallback((ratings: Record<string, ExerciseRating>, exerciseNotes: Record<string, string>) => {
    if (!activeWorkout || !schedule) return
    const planId = schedule.planId
    const currentWeights = getNextWeights(planId)
    const nextWeights = { ...currentWeights }
    for (const ex of activeWorkout.exercises) {
      if (ex.durationSec || ex.bodyweight) continue
      const current = nextWeights[ex.id] ?? ex.sets[0]?.weightKg ?? 0
      const choice = ratings[ex.id] ?? 'same'
      nextWeights[ex.id] = getNextWeightKg(choice, current, ex.id)
    }
    setNextWeights(planId, nextWeights)
    addWorkoutHistoryEntry({
      date: getTodayDateString(),
      workoutId: activeWorkout.workoutId,
      workoutName: activeWorkout.workoutName,
      exercises: activeWorkout.exercises.map((ex) => ({
        id: ex.id,
        name: ex.name,
        // Сохраняем только рабочие подходы (без разминочных)
        sets: ex.sets
          .filter((s) => !s.isWarmup)
          .map((s) => {
            const set: { weightKg: number; reps: number; skipped?: boolean; durationSec?: number } = {
              weightKg: s.weightKg,
              reps: s.reps,
              skipped: s.skipped,
            }
            if (ex.durationSec) {
              set.durationSec = ex.durationSec
            }
            return set
          }),
        notes: exerciseNotes[ex.id]?.trim() || undefined,
      })),
    })
    setActiveWorkout(null)
  }, [activeWorkout, schedule])

  if (!onboardingDone) {
    const onboardingWrapperClass =
      'min-h-[100dvh] w-full flex flex-col items-center bg-beefy-cream-light dark:bg-beefy-dark-bg text-beefy-primary dark:text-beefy-dark-text overflow-x-hidden'
    const safeAreaTop = { paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }
    if (selectedPlanId === null) {
      return (
        <div className={onboardingWrapperClass} style={safeAreaTop}>
          <OnboardingProgramChoice onSelect={setSelectedPlanId} />
        </div>
      )
    }
    const plan = getPlanById(selectedPlanId)
    const exerciseIds =
      selectedPlanId === VALENTIN_PLAN_ID ? getValentinAllExerciseIds() : getHelenAllExerciseIds()
    if (!plan) return null
    return (
      <div className={onboardingWrapperClass} style={safeAreaTop}>
        <OnboardingWeights
          exerciseIds={exerciseIds}
          plan={plan}
          onBack={() => setSelectedPlanId(null)}
          onComplete={(weights) => handleOnboardingComplete(selectedPlanId, weights)}
        />
      </div>
    )
  }

  if (activeWorkout) {
    return (
      <div className="min-h-[100dvh] flex flex-col w-full max-w-full min-w-0 overflow-x-hidden">
        <header
        className="bg-beefy-cream-light dark:bg-beefy-dark-bg text-beefy-primary dark:text-beefy-dark-text py-3 px-4 shadow flex items-center gap-2 shrink-0 border-b border-beefy-primary/10 dark:border-beefy-dark-border"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
          <button
            type="button"
            onClick={() => setActiveWorkout(null)}
            className="text-beefy-primary dark:text-beefy-dark-text-muted hover:text-beefy-primary dark:hover:text-beefy-dark-text text-sm min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center touch-manipulation"
          >
            ← Назад
          </button>
          <h1 className="text-base sm:text-lg font-semibold truncate flex-1">{activeWorkout.workoutName}</h1>
        </header>
        <main className="flex-1 p-4 overflow-auto min-h-0 min-w-0 w-full max-w-full bg-beefy-cream-light dark:bg-beefy-dark-bg text-beefy-primary dark:text-beefy-dark-text">
          <ActiveWorkoutView
            workoutName={activeWorkout.workoutName}
            exercises={activeWorkout.exercises}
            onComplete={handleWorkoutComplete}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] flex flex-col w-full max-w-full min-w-0 overflow-x-hidden">
      <header
        className="bg-beefy-cream-light dark:bg-beefy-dark-bg text-beefy-primary dark:text-beefy-dark-text py-3 px-4 shadow shrink-0 min-w-0 border-b border-beefy-primary/10 dark:border-beefy-dark-border"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        {isSettingsOpen ? (
          <div className="flex items-center gap-2 min-h-[44px]">
            <button
              type="button"
              onClick={() => setMainTab('workouts')}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2 rounded-lg text-beefy-text-secondary dark:text-beefy-dark-text-muted hover:text-beefy-primary dark:hover:text-beefy-dark-text touch-manipulation"
              aria-label="Назад"
            >
              ←
            </button>
            <h1 className="text-base sm:text-lg font-semibold">Настройки</h1>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 min-w-0">
            <div className="flex items-center gap-2 min-w-0 shrink-0">
              <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="h-9 w-9 rounded-lg shrink-0 object-contain" />
              <h1 className="text-base sm:text-lg font-semibold truncate">BeefyCorg</h1>
            </div>
            <button
              type="button"
              onClick={() => setMainTab('settings')}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-beefy-text-secondary dark:text-beefy-dark-text-muted hover:bg-beefy-primary/10 dark:hover:bg-beefy-dark-border/30 hover:text-beefy-primary dark:hover:text-beefy-dark-text touch-manipulation"
              aria-label="Настройки"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        )}
      </header>
      {!isSettingsOpen && (
        <nav
          className="flex min-h-[48px] items-stretch gap-1 px-4 py-2 bg-beefy-cream-light dark:bg-beefy-dark-bg border-b border-beefy-primary/10 dark:border-beefy-dark-border shrink-0"
          role="tablist"
          aria-label="Разделы"
        >
          <button
            role="tab"
            aria-selected={mainTab === 'workouts'}
            type="button"
            onClick={() => setMainTab('workouts')}
            className={`flex-1 min-h-[40px] rounded-xl text-sm font-medium touch-manipulation transition-colors ${
              mainTab === 'workouts'
                ? 'bg-beefy-primary dark:bg-beefy-accent text-beefy-cream dark:text-white shadow-sm'
                : 'text-beefy-text-secondary dark:text-beefy-dark-text-muted hover:bg-beefy-primary/10 dark:hover:bg-beefy-dark-border/30 hover:text-beefy-primary dark:hover:text-beefy-dark-text'
            }`}
          >
            Тренировки
          </button>
          <button
            role="tab"
            aria-selected={mainTab === 'progress'}
            type="button"
            onClick={() => setMainTab('progress')}
            className={`flex-1 min-h-[40px] rounded-xl text-sm font-medium touch-manipulation transition-colors ${
              mainTab === 'progress'
                ? 'bg-beefy-primary dark:bg-beefy-accent text-beefy-cream dark:text-white shadow-sm'
                : 'text-beefy-text-secondary dark:text-beefy-dark-text-muted hover:bg-beefy-primary/10 dark:hover:bg-beefy-dark-border/30 hover:text-beefy-primary dark:hover:text-beefy-dark-text'
            }`}
          >
            Прогресс
          </button>
          <button
            role="tab"
            aria-selected={mainTab === 'measurements'}
            type="button"
            onClick={() => setMainTab('measurements')}
            className={`flex-1 min-h-[40px] rounded-xl text-sm font-medium touch-manipulation transition-colors ${
              mainTab === 'measurements'
                ? 'bg-beefy-primary dark:bg-beefy-accent text-beefy-cream dark:text-white shadow-sm'
                : 'text-beefy-text-secondary dark:text-beefy-dark-text-muted hover:bg-beefy-primary/10 dark:hover:bg-beefy-dark-border/30 hover:text-beefy-primary dark:hover:text-beefy-dark-text'
            }`}
          >
            Замеры
          </button>
        </nav>
      )}
      <main className="flex-1 p-4 min-h-0 min-w-0 overflow-auto w-full max-w-full bg-beefy-cream-light dark:bg-beefy-dark-bg text-beefy-primary dark:text-beefy-dark-text">
        {isSettingsOpen ? (
          <SettingsPage />
        ) : mainTab === 'progress' ? (
          <ProgressPage />
        ) : mainTab === 'measurements' ? (
          <MeasurementsPage />
        ) : hasSchedule ? (
          <UpcomingWorkouts onStartWorkout={handleStartWorkout} />
        ) : (
          <p className="text-beefy-text-secondary dark:text-beefy-dark-text-muted">Расписание не найдено. Пройдите онбординг заново.</p>
        )}
      </main>
    </div>
  )
}
