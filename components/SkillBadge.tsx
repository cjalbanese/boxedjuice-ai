"use client";

interface SkillBadgeProps {
  label: string;
  variant?: "match" | "gap" | "strength";
}

const variantStyles = {
  match: "bg-emerald-900/30 text-emerald-300 border-emerald-800/50",
  gap: "bg-red-900/30 text-red-300 border-red-800/50",
  strength: "bg-purple-900/30 text-purple-300 border-purple-800/50",
};

export default function SkillBadge({ label, variant = "match" }: SkillBadgeProps) {
  return (
    <span className={`inline-block rounded-full text-sm px-3 py-1 border ${variantStyles[variant]}`}>
      {label}
    </span>
  );
}
