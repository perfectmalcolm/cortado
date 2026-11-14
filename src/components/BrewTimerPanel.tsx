import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Pause, Play, RotateCcw, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import type { CoffeeRecipe } from '../types/coffee';
import { formatSeconds, playSoftChime } from '../lib/recipeUtils';

interface BrewTimerPanelProps {
  recipe: CoffeeRecipe;
  autoStartSignal: number;
}

export function BrewTimerPanel({ recipe, autoStartSignal }: BrewTimerPanelProps) {
  const steps = useMemo(
    () =>
      recipe.brewSteps.length > 0
        ? recipe.brewSteps
        : [{ stepNumber: 1, title: 'Brew Extraction', instruction: 'Brew evenly.', durationSeconds: 120 }],
    [recipe.brewSteps],
  );

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(steps[0].durationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lastSignalRef = useRef(0);

  // Reset timer when recipe changes
  useEffect(() => {
    setCurrentStepIdx(0);
    setSecondsLeft(steps[0].durationSeconds);
    setIsRunning(false);
    setIsCompleted(false);
  }, [recipe.drinkName, steps]);

  // Handle explicit "Start Brew Timer" button trigger from recipe card
  useEffect(() => {
    if (autoStartSignal > 0 && autoStartSignal !== lastSignalRef.current) {
      lastSignalRef.current = autoStartSignal;
      setCurrentStepIdx(0);
      setSecondsLeft(steps[0].durationSeconds);
      setIsCompleted(false);
      setIsRunning(true);
    }
  }, [autoStartSignal, steps]);

  // Tick interval
  useEffect(() => {
    if (!isRunning || isCompleted) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;
        // Step finished
        if (soundEnabled) playSoftChime();
        if (currentStepIdx + 1 < steps.length) {
          const nextIdx = currentStepIdx + 1;
          setCurrentStepIdx(nextIdx);
          return steps[nextIdx].durationSeconds;
        } else {
          setIsRunning(false);
          setIsCompleted(true);
          return 0;
        }
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRunning, isCompleted, currentStepIdx, steps, soundEnabled]);

  const activeStep = steps[currentStepIdx] ?? steps[0];
  const totalStepSeconds = Math.max(1, activeStep.durationSeconds);
  const stepProgress = isCompleted ? 1 : (totalStepSeconds - secondsLeft) / totalStepSeconds;

  const totalRecipeSeconds = steps.reduce((acc, s) => acc + s.durationSeconds, 0);
  const elapsedBeforeCurrent = steps
    .slice(0, currentStepIdx)
    .reduce((acc, s) => acc + s.durationSeconds, 0);
  const totalElapsed = isCompleted
    ? totalRecipeSeconds
    : elapsedBeforeCurrent + (totalStepSeconds - secondsLeft);

  const circleRadius = 64;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference * (1 - Math.min(1, Math.max(0, stepProgress)));

  const handleSelectStep = (idx: number) => {
    setCurrentStepIdx(idx);
    setSecondsLeft(steps[idx].durationSeconds);
    setIsCompleted(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsCompleted(false);
    setCurrentStepIdx(0);
    setSecondsLeft(steps[0].durationSeconds);
  };

  return (
    <section
      id="brew-timer"
      aria-labelledby="brew-timer-heading"
      className="border border-[#141210]/10 bg-white rounded-2xl p-6 md:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#141210]/10">
        <div>
          <p className="text-xs font-medium tracking-wide text-[#8C4A27]">
            Interactive Extraction Guide · {recipe.brewMethod}
          </p>
          <h2 id="brew-timer-heading" className="text-2xl md:text-3xl font-semibold text-[#141210] mt-1">
            {recipe.drinkName} Timer
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#5A524C] border border-[#141210]/12 rounded-lg hover:bg-[#FAF8F5] transition-colors whitespace-nowrap shrink-0"
            aria-label={soundEnabled ? 'Mute step chime' : 'Enable step chime'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? 'Chime On' : 'Chime Muted'}</span>
          </button>
          <span className="font-mono-tabular text-xs text-[#5A524C]">
            {formatSeconds(totalElapsed)} / {formatSeconds(totalRecipeSeconds)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 items-start">
        {/* Left: Circular countdown clock & transport controls */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center bg-[#FAF8F5] border border-[#141210]/8 rounded-xl p-6">
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg className="w-44 h-44 -rotate-90" viewBox="0 0 160 160" aria-hidden="true">
              <circle
                cx="80"
                cy="80"
                r={circleRadius}
                fill="none"
                stroke="#E8E1D9"
                strokeWidth="8"
              />
              <circle
                cx="80"
                cy="80"
                r={circleRadius}
                fill="none"
                stroke="#8C4A27"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-[stroke-dashoffset] duration-300 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              {isCompleted ? (
                <>
                  <CheckCircle2 className="w-7 h-7 text-[#8C4A27] mb-1" />
                  <span className="text-sm font-semibold text-[#141210]">Pour Complete</span>
                </>
              ) : (
                <>
                  <span className="text-xs font-medium text-[#5A524C]">
                    Step {currentStepIdx + 1} of {steps.length}
                  </span>
                  <span className="font-mono-tabular text-4xl font-semibold text-[#141210] tracking-tight mt-0.5">
                    {formatSeconds(secondsLeft)}
                  </span>
                  {typeof activeStep.targetWaterGrams === 'number' && activeStep.targetWaterGrams > 0 && (
                    <span className="font-mono-tabular text-xs text-[#8C4A27] mt-1">
                      Target {activeStep.targetWaterGrams}g
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="mt-5 text-center max-w-sm">
            <h3 className="text-base font-semibold text-[#141210]">{activeStep.title}</h3>
            <p className="text-sm text-[#5A524C] mt-1 leading-relaxed">{activeStep.instruction}</p>
          </div>

          <div className="flex items-center gap-2 mt-6">
            <button
              type="button"
              onClick={() => handleSelectStep(Math.max(0, currentStepIdx - 1))}
              disabled={currentStepIdx === 0}
              className="p-2.5 rounded-lg border border-[#141210]/15 text-[#141210] hover:bg-white disabled:opacity-40 transition-colors"
              aria-label="Previous step"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (isCompleted) {
                  handleReset();
                  setIsRunning(true);
                } else {
                  setIsRunning((r) => !r);
                }
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#141210] text-white text-sm font-medium hover:bg-[#2B2623] transition-colors whitespace-nowrap shrink-0"
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>{isCompleted ? 'Brew Again' : totalElapsed > 0 ? 'Resume' : 'Start Timer'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (currentStepIdx + 1 < steps.length) {
                  handleSelectStep(currentStepIdx + 1);
                }
              }}
              disabled={currentStepIdx + 1 >= steps.length}
              className="p-2.5 rounded-lg border border-[#141210]/15 text-[#141210] hover:bg-white disabled:opacity-40 transition-colors"
              aria-label="Next step"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="p-2.5 rounded-lg border border-[#141210]/15 text-[#5A524C] hover:text-[#141210] hover:bg-white transition-colors"
              aria-label="Reset timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Step-by-step timeline */}
        <div className="lg:col-span-7 space-y-3">
          {steps.map((step, idx) => {
            const isActive = idx === currentStepIdx && !isCompleted;
            const isDone = isCompleted || idx < currentStepIdx;
            return (
              <button
                key={`${step.stepNumber}-${step.title}`}
                type="button"
                onClick={() => handleSelectStep(idx)}
                className={`w-full text-left p-4 rounded-xl border transition-colors flex items-start justify-between gap-4 ${
                  isActive
                    ? 'border-[#8C4A27] bg-[#8C4A27]/[0.04]'
                    : isDone
                      ? 'border-[#141210]/8 bg-[#FAF8F5]/70 opacity-75'
                      : 'border-[#141210]/10 bg-white hover:bg-[#FAF8F5]'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono-tabular font-semibold shrink-0 mt-0.5 ${
                      isActive
                        ? 'bg-[#8C4A27] text-white'
                        : isDone
                          ? 'bg-[#141210] text-white'
                          : 'bg-[#F0ECE6] text-[#5A524C]'
                    }`}
                  >
                    {isDone ? '✓' : step.stepNumber}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[#141210]">{step.title}</span>
                      {typeof step.targetWaterGrams === 'number' && step.targetWaterGrams > 0 && (
                        <span className="text-xs font-mono-tabular text-[#5A524C]">
                          · {step.targetWaterGrams}g water
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#5A524C] mt-1 leading-relaxed">{step.instruction}</p>
                  </div>
                </div>
                <span className="font-mono-tabular text-xs font-medium text-[#141210] shrink-0 pt-1">
                  {formatSeconds(step.durationSeconds)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
