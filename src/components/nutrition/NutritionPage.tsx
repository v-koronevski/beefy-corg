import { useState } from 'react'
import { getBodyMeasurements, getCalorieProfile, setCalorieProfile } from '@/utils/storage'
import { calculateDailyCalories, calculateMacros } from '@/utils/calories'
import type { CalorieProfile, ActivityLevel, NutritionGoal } from '@/types'

/** Дефицит калорий в долях от суточной нормы (15% ≈ −400 ккал при TDEE 2650) */
const DEFICIT_PERCENT = 0.15
/** Профицит калорий в долях от суточной нормы (15% ≈ +400 ккал при TDEE 2650) */
const SURPLUS_PERCENT = 0.15

function getLastWeight(): number | null {
  const list = getBodyMeasurements()
  if (list.length === 0) return null
  const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date))
  const w = sorted[0]?.values?.weight
  return w != null && w > 0 ? w : null
}

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Минимальная (офис, почти без спорта)',
  light: 'Низкая (1–3 тренировки в неделю)',
  moderate: 'Средняя (3–5 тренировок или активная работа)',
  active: 'Высокая (6–7 интенсивных тренировок)',
  extra: 'Очень высокая (спортсмены, 2 тренировки в день)',
}

const GOAL_LABELS: Record<NutritionGoal, string> = {
  loss: 'Похудение',
  maintain: 'Поддержание',
  gain: 'Набор массы',
}

export function NutritionPage() {
  const [calorieProfile, setCalorieProfileState] = useState<CalorieProfile | null>(() => getCalorieProfile())
  const [editingProfile, setEditingProfile] = useState(!getCalorieProfile())
  const [profileForm, setProfileForm] = useState({
    heightCm: calorieProfile?.heightCm ?? 170,
    birthYear: calorieProfile?.birthYear ?? new Date().getFullYear() - 30,
    sex: (calorieProfile?.sex ?? 'male') as 'male' | 'female',
    activityLevel: (calorieProfile?.activityLevel ?? 'moderate') as ActivityLevel,
    goal: (calorieProfile?.goal ?? 'maintain') as NutritionGoal,
  })

  const refreshProfile = () => setCalorieProfileState(getCalorieProfile())
  const latestWeight = getLastWeight()

  const calorieResult =
    calorieProfile && latestWeight != null && latestWeight > 0
      ? calculateDailyCalories(
          latestWeight,
          calorieProfile.heightCm,
          calorieProfile.birthYear,
          calorieProfile.sex,
          calorieProfile.activityLevel
        )
      : null

  const goal = calorieProfile?.goal ?? 'maintain'
  const targetCalories =
    calorieResult == null
      ? null
      : goal === 'loss'
        ? Math.max(1200, Math.round(calorieResult.tdee * (1 - DEFICIT_PERCENT)))
        : goal === 'gain'
          ? Math.round(calorieResult.tdee * (1 + SURPLUS_PERCENT))
          : calorieResult.tdee

  const macros =
    targetCalories != null && latestWeight != null && latestWeight > 0
      ? calculateMacros(targetCalories, latestWeight)
      : null

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    const height = Math.round(Number(profileForm.heightCm))
    const birthYear = Math.round(Number(profileForm.birthYear))
    const currentYear = new Date().getFullYear()
    if (height < 100 || height > 250 || birthYear < currentYear - 120 || birthYear > currentYear - 14) return
    setCalorieProfile({
      heightCm: height,
      birthYear,
      sex: profileForm.sex,
      activityLevel: profileForm.activityLevel,
      goal: profileForm.goal,
    })
    refreshProfile()
    setEditingProfile(false)
  }

  return (
    <div className="space-y-6 w-full max-w-xl min-w-0">
      <section className="bg-white dark:bg-beefy-dark-bg-card rounded-xl border border-beefy-primary/20 dark:border-beefy-dark-border p-4 shadow-sm min-w-0">
        <h2 className="text-lg font-semibold text-beefy-primary dark:text-beefy-dark-text mb-2">Профиль питания</h2>
        <p className="text-sm text-beefy-text-secondary dark:text-beefy-dark-text-muted mb-4">
          Расчёт по формуле Mifflin-St Jeor (1990), Am J Clin Nutr, PubMed. Вес берётся из последнего замера (вкладка «Замеры»).
        </p>
        {editingProfile || !calorieProfile ? (
          <form onSubmit={handleSaveProfile} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium text-beefy-text-secondary dark:text-beefy-dark-text-muted mb-1">Рост, см</label>
              <input
                type="number"
                min={100}
                max={250}
                value={profileForm.heightCm}
                onChange={(e) => setProfileForm((p) => ({ ...p, heightCm: e.target.value === '' ? 0 : Number(e.target.value) }))}
                className="w-full min-h-[44px] rounded-lg border border-beefy-primary/30 dark:border-beefy-dark-border bg-white dark:bg-beefy-dark-bg text-beefy-primary dark:text-beefy-dark-text px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-beefy-text-secondary dark:text-beefy-dark-text-muted mb-1">Год рождения</label>
              <input
                type="number"
                min={1900}
                max={new Date().getFullYear() - 14}
                value={profileForm.birthYear}
                onChange={(e) => setProfileForm((p) => ({ ...p, birthYear: e.target.value === '' ? 0 : Number(e.target.value) }))}
                className="w-full min-h-[44px] rounded-lg border border-beefy-primary/30 dark:border-beefy-dark-border bg-white dark:bg-beefy-dark-bg text-beefy-primary dark:text-beefy-dark-text px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-beefy-text-secondary dark:text-beefy-dark-text-muted mb-1">Пол</label>
              <div className="flex gap-2">
                {(['male', 'female'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setProfileForm((p) => ({ ...p, sex: s }))}
                    className={`min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-medium touch-manipulation ${
                      profileForm.sex === s ? 'bg-beefy-primary dark:bg-beefy-accent text-beefy-cream dark:text-white' : 'bg-beefy-cream/50 dark:bg-beefy-dark-border/30 text-beefy-primary dark:text-beefy-dark-text'
                    }`}
                  >
                    {s === 'male' ? 'Мужской' : 'Женский'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-beefy-text-secondary dark:text-beefy-dark-text-muted mb-1">Уровень активности</label>
              <select
                value={profileForm.activityLevel}
                onChange={(e) => setProfileForm((p) => ({ ...p, activityLevel: e.target.value as ActivityLevel }))}
                className="w-full min-h-[44px] rounded-lg border border-beefy-primary/30 dark:border-beefy-dark-border bg-white dark:bg-beefy-dark-bg text-beefy-primary dark:text-beefy-dark-text px-3 py-2"
              >
                {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((level) => (
                  <option key={level} value={level}>
                    {ACTIVITY_LABELS[level]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-beefy-text-secondary dark:text-beefy-dark-text-muted mb-1">Цель</label>
              <div className="flex flex-wrap gap-2">
                {(['loss', 'maintain', 'gain'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setProfileForm((p) => ({ ...p, goal: g }))}
                    className={`min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-medium touch-manipulation ${
                      profileForm.goal === g ? 'bg-beefy-primary dark:bg-beefy-accent text-beefy-cream dark:text-white' : 'bg-beefy-cream/50 dark:bg-beefy-dark-border/30 text-beefy-primary dark:text-beefy-dark-text'
                    }`}
                  >
                    {GOAL_LABELS[g]}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="w-full min-h-[44px] py-2.5 bg-beefy-primary dark:bg-beefy-accent text-beefy-cream dark:text-white font-medium rounded-lg hover:opacity-90 active:opacity-80 touch-manipulation"
            >
              Сохранить
            </button>
          </form>
        ) : (
          <>
            {calorieResult ? (
              <div className="space-y-2">
                <p className="text-beefy-primary dark:text-beefy-dark-text">
                  <span className="font-medium">Базовый обмен (BMR):</span>{' '}
                  <span className="text-lg font-semibold">{calorieResult.bmr}</span> ккал/сут
                </p>
                <p className="text-beefy-primary dark:text-beefy-dark-text">
                  <span className="font-medium">Суточная норма (TDEE):</span>{' '}
                  <span className="text-lg font-semibold text-beefy-primary dark:text-beefy-accent">{calorieResult.tdee}</span> ккал/сут
                </p>
                {targetCalories != null && (
                  <p className="text-beefy-primary dark:text-beefy-dark-text">
                    <span className="font-medium">Рекомендация ({GOAL_LABELS[goal]}):</span>{' '}
                    <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{targetCalories}</span> ккал
                  </p>
                )}
                {macros != null && (
                  <div className="pt-2 mt-2 border-t border-beefy-primary/10 dark:border-beefy-dark-border">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-beefy-primary/20 dark:border-beefy-dark-border">
                          <th className="text-left py-2 pr-3 font-medium text-beefy-text-secondary dark:text-beefy-dark-text-muted">Нутриент</th>
                          <th className="text-right py-2 px-3 font-medium text-beefy-text-secondary dark:text-beefy-dark-text-muted">г/сут</th>
                        </tr>
                      </thead>
                      <tbody className="text-beefy-primary dark:text-beefy-dark-text">
                      <tr className="border-b border-beefy-primary/10 dark:border-beefy-dark-border">
                          <td className="py-2 pr-3">Калории</td>
                          <td className="text-right py-2 px-3 font-medium">
                            {targetCalories} ккал
                          </td>
                        </tr>
                        <tr className="border-b border-beefy-primary/10 dark:border-beefy-dark-border">
                          <td className="py-2 pr-3">Белки</td>
                          <td className="text-right py-2 px-3 font-medium">{macros.proteinG}</td>
                        </tr>
                        <tr className="border-b border-beefy-primary/10 dark:border-beefy-dark-border">
                          <td className="py-2 pr-3">Жиры</td>
                          <td className="text-right py-2 px-3 font-medium">{macros.fatG}</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-3">Углеводы</td>
                          <td className="text-right py-2 px-3 font-medium">{macros.carbsG}</td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="text-xs text-beefy-text-secondary dark:text-beefy-dark-text-muted mt-2">
                      Белок 2 г/кг, жиры 25% калорий, остальное — углеводы.
                    </p>
                  </div>
                )}
                <p className="text-sm text-beefy-text-secondary dark:text-beefy-dark-text-muted">
                  По последнему весу <strong>{latestWeight} кг</strong>.
                </p>
              </div>
            ) : (
              <p className="text-beefy-text-secondary dark:text-beefy-dark-text-muted text-sm">
                Добавьте вес в замерах (вкладка «Замеры»), чтобы увидеть расчёт.
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setProfileForm({
                  heightCm: calorieProfile?.heightCm ?? 170,
                  birthYear: calorieProfile?.birthYear ?? new Date().getFullYear() - 30,
                  sex: calorieProfile?.sex ?? 'male',
                  activityLevel: calorieProfile?.activityLevel ?? 'moderate',
                  goal: (calorieProfile?.goal ?? 'maintain') as NutritionGoal,
                })
                setEditingProfile(true)
              }}
              className="mt-4 min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-medium bg-beefy-cream/50 dark:bg-beefy-dark-border/30 text-beefy-primary dark:text-beefy-dark-text border border-beefy-primary/20 dark:border-beefy-dark-border touch-manipulation"
            >
              Изменить данные
            </button>
          </>
        )}
      </section>
    </div>
  )
}
