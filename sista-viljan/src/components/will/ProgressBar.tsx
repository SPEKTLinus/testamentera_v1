interface ProgressBarProps {
  percent: number;
  label?: string;
}

export function ProgressBar({ percent, label }: ProgressBarProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[#6b7280] font-body">
          {label || `Du är ${Math.round(percent)}% klar`}
        </span>
        <span className="text-xs text-[#6b7280] font-body">{Math.round(percent)}%</span>
      </div>
      <div className="h-px bg-[#e5e5e5] w-full relative overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-[#1a2e4a] progress-bar"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
