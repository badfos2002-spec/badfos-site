interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
}

const stepNames = [
  'סוג חולצה',
  'בחירת צבע',
  'העלאת עיצוב',
  'מידות וכמויות',
]

export default function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 md:gap-4">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNumber = index + 1
        const isActive = stepNumber === currentStep
        const isCompleted = stepNumber < currentStep

        return (
          <div key={stepNumber} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  isActive
                    ? 'bg-primary text-white scale-110'
                    : isCompleted
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? '✓' : stepNumber}
              </div>
              <span
                className={`text-xs mt-1 text-center hidden md:block ${
                  isActive ? 'font-bold text-primary' : 'text-gray-500'
                }`}
              >
                {stepNames[index]}
              </span>
            </div>
            {stepNumber < totalSteps && (
              <div
                className={`w-8 md:w-16 h-1 mx-1 ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
