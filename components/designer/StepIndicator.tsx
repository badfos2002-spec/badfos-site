interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
  stepNames?: string[]
}

const defaultStepNames = ['סוג חולצה', 'צבע', 'עיצוב', 'מידות וכמויות']

export default function StepIndicator({ currentStep, totalSteps, stepNames = defaultStepNames }: StepIndicatorProps) {
  return (
    <div className="flex items-start w-full mb-8 px-2">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNumber = index + 1
        const isActive = stepNumber === currentStep
        const isCompleted = stepNumber < currentStep

        return (
          <div key={stepNumber} className="flex items-start flex-1 last:flex-none">
            {/* Step circle + label */}
            <div className="flex flex-col items-center text-center flex-shrink-0 w-16">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 relative ${
                  isCompleted
                    ? 'bg-green-500 border-green-500 text-white'
                    : isActive
                    ? 'bg-yellow-500 border-yellow-500 text-white'
                    : 'bg-white border-gray-300 text-gray-500'
                }`}
              >
                <span className="text-sm font-semibold">
                  {isCompleted ? '✓' : stepNumber}
                </span>
              </div>
              <p
                className={`mt-2 text-xs sm:text-sm font-semibold ${
                  isCompleted
                    ? 'text-green-600'
                    : isActive
                    ? 'text-yellow-600'
                    : 'text-gray-500'
                }`}
              >
                {stepNames[index]}
              </p>
            </div>

            {/* Connector line (not after last step) */}
            {stepNumber < totalSteps && (
              <div
                className={`flex-1 h-1 mt-[19px] mx-1 sm:mx-2 transition-colors duration-300 ${
                  isCompleted ? 'bg-green-400' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
