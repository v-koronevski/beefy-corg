/**
 * Расчёт суточной нормы калорий на основе формулы Mifflin-St Jeor (1990).
 * Одна из наиболее исследованных формул для оценки базового метаболизма (BMR),
 * см. PubMed 2305711; Am J Clin Nutr. 1990.
 *
 * TDEE (Total Daily Energy Expenditure) = BMR × коэффициент активности.
 */

import type { ActivityLevel } from '@/types'

/** Коэффициенты активности для расчёта TDEE (по данным исследований, напр. compendium of physical activities). */
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,   // почти без движения, офис
  light: 1.375,     // 1–3 тренировки в неделю
  moderate: 1.55,   // 3–5 тренировок или активная работа
  active: 1.725,    // 6–7 интенсивных тренировок в неделю
  extra: 1.9,       // спортсмены, две тренировки в день
}

/**
 * Базовый обмен (BMR) по уравнению Mifflin-St Jeor.
 * @param weightKg — вес в кг (из замеров)
 * @param heightCm — рост в см
 * @param ageYears — возраст в полных годах
 * @param sex — пол
 */
export function mifflinStJeorBMR(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: 'male' | 'female'
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears
  return sex === 'male' ? base + 5 : base - 161
}

/**
 * Суточная норма калорий (TDEE) = BMR × коэффициент активности.
 */
export function tdeeFromBMR(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel])
}

/**
 * Расчёт BMR и TDEE по весу и профилю. Возвращает null, если данных недостаточно.
 */
export function calculateDailyCalories(
  weightKg: number,
  heightCm: number,
  birthYear: number,
  sex: 'male' | 'female',
  activityLevel: ActivityLevel
): { bmr: number; tdee: number } | null {
  const currentYear = new Date().getFullYear()
  const age = Math.max(0, Math.min(120, currentYear - birthYear))
  if (weightKg <= 0 || heightCm <= 0) return null
  const bmr = Math.round(mifflinStJeorBMR(weightKg, heightCm, age, sex))
  const tdee = tdeeFromBMR(bmr, activityLevel)
  return { bmr, tdee }
}

/** Калории на грамм: белок и углеводы 4 ккал/г, жиры 9 ккал/г */
const KCAL_PER_G_PROTEIN = 4
const KCAL_PER_G_FAT = 9
const KCAL_PER_G_CARBS = 4

/**
 * Расчёт БЖУ для заданной калорийности (по данным PubMed).
 * Белок: 2.0 г/кг — в диапазоне 1.6–2.4 г/кг (Longland et al., PubMed 29182451; сохранение мышц при дефиците, PubMed 35538903).
 * Жиры: 25% калорий, не ниже 0.8 г/кг (DRI 20–35%).
 * Углеводы: остаток калорий.
 */
export function calculateMacros(
  totalCalories: number,
  weightKg: number
): { proteinG: number; fatG: number; carbsG: number } | null {
  if (totalCalories < 800 || weightKg <= 0) return null
  const proteinG = Math.round(weightKg * 2.0)
  const fatPct = 0.25
  const fatKcal = Math.max(
    totalCalories * fatPct,
    weightKg * 0.8 * KCAL_PER_G_FAT
  )
  const fatG = Math.round(fatKcal / KCAL_PER_G_FAT)
  const remainingKcal = totalCalories - proteinG * KCAL_PER_G_PROTEIN - fatG * KCAL_PER_G_FAT
  const carbsG = Math.max(0, Math.round(remainingKcal / KCAL_PER_G_CARBS))
  return { proteinG, fatG, carbsG }
}

/** @deprecated Используйте calculateMacros */
export function calculateDeficitMacros(totalCalories: number, weightKg: number) {
  return calculateMacros(totalCalories, weightKg)
}
