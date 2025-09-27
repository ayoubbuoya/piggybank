interface StepperProps {
  steps: string[];
  current: number;
}

export default function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="flex items-center gap-3 mb-6">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={
              "w-8 h-8 rounded-full grid place-items-center border-3 border-ink-950 " +
              (i <= current ? "bg-lime-300" : "bg-white")
            }
          >
            {i + 1}
          </div>
          <span className="font-bold">{s}</span>
          {i < steps.length - 1 && <div className="w-10 h-1 bg-ink-950" />}
        </div>
      ))}
    </div>
  );
}
