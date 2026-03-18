"use client";

interface RateLimitBadgeProps {
  remaining: number | null;
}

export default function RateLimitBadge({ remaining }: RateLimitBadgeProps) {
  if (remaining === null) return null;

  const color =
    remaining > 10
      ? "text-emerald-300 bg-emerald-900/30"
      : remaining > 3
        ? "text-amber-300 bg-amber-900/30"
        : "text-red-300 bg-red-900/30";

  return (
    <div className="flex justify-center mb-6">
      <span className={`rounded-full text-xs px-3 py-1 ${color}`}>
        {remaining} {remaining === 1 ? "analysis" : "analyses"} remaining today
      </span>
    </div>
  );
}
