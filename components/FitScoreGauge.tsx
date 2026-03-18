"use client";

interface FitScoreGaugeProps {
  score: number;
  compact?: boolean;
}

function getScoreColor(score: number) {
  if (score >= 75) return { stroke: "#34d399", text: "text-emerald-400", label: "Strong Fit" };
  if (score >= 50) return { stroke: "#fbbf24", text: "text-amber-400", label: "Moderate Fit" };
  return { stroke: "#f87171", text: "text-red-400", label: "Weak Fit" };
}

export default function FitScoreGauge({ score, compact }: FitScoreGaugeProps) {
  const { stroke, text, label } = getScoreColor(score);
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - (score / 100) * circumference;

  const size = compact ? "w-20 h-20" : "w-32 h-32";
  const textSize = compact ? "text-xl" : "text-3xl";
  const subSize = compact ? "text-[10px]" : "text-xs";

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${size}`}>
        <svg className={`${size} -rotate-90`} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#2a1f2a" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke={stroke} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            className="score-gauge-animate" style={{ strokeDashoffset: dashOffset }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${textSize} font-bold ${text}`}>{score}</span>
          <span className={`text-gray-500 ${subSize}`}>/100</span>
        </div>
      </div>
      <span className={`mt-2 text-sm font-medium ${text}`}>{label}</span>
    </div>
  );
}
