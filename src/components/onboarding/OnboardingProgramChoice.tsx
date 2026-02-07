import { helenPlan } from '@/data/helenPlan'
import { valentinPlan } from '@/data/valentinPlan'

interface OnboardingProgramChoiceProps {
  onSelect: (planId: string) => void
}

const PROGRAMS = [
  {
    id: helenPlan.id,
    name: helenPlan.name,
    description: 'Full-Body 5×5 на Смите и гравитроне. Ноги 5×5, верх дозированно (3×5).',
  },
  {
    id: valentinPlan.id,
    name: valentinPlan.name,
    description: 'Full-Body 5×5 на свободных весах. Выход на подтягивания через тягу вертикального блока.',
  },
]

export function OnboardingProgramChoice({ onSelect }: OnboardingProgramChoiceProps) {
  return (
    <div className="max-w-md mx-auto py-6 px-4 w-full min-w-0">
      <h2 className="text-lg sm:text-xl font-semibold text-beefy-primary dark:text-beefy-dark-text mb-2">Выберите программу</h2>
      <p className="text-beefy-text-secondary dark:text-beefy-dark-text-muted text-sm mb-6">
        Начальная настройка. Затем укажете стартовые веса для упражнений выбранной программы.
      </p>
      <ul className="space-y-4">
        {PROGRAMS.map((program) => (
          <li key={program.id}>
            <button
              type="button"
              onClick={() => onSelect(program.id)}
              className="w-full text-left border border-beefy-primary/20 dark:border-beefy-dark-border rounded-xl p-4 shadow-sm bg-white dark:bg-beefy-dark-bg-card hover:border-beefy-accent dark:hover:border-beefy-accent hover:bg-beefy-cream/50 dark:hover:bg-beefy-dark-border/50 active:opacity-90 touch-manipulation transition-colors"
            >
              <span className="font-medium text-beefy-primary dark:text-beefy-dark-text block mb-1">{program.name}</span>
              <span className="text-sm text-beefy-text-secondary dark:text-beefy-dark-text-muted">{program.description}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
