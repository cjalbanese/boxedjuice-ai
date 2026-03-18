"use client";

import SkillBadge from "./SkillBadge";

interface MatchItem {
  skill?: string;
  evidence?: string;
  requirement?: string;
  suggestion?: string;
  strength?: string;
  relevance?: string;
}

interface MatchSectionProps {
  title: string;
  icon: React.ReactNode;
  items: MatchItem[];
  variant: "match" | "gap" | "strength";
}

export default function MatchSection({ title, icon, items, variant }: MatchSectionProps) {
  const labelKey = variant === "match" ? "skill" : variant === "gap" ? "requirement" : "strength";
  const detailKey = variant === "match" ? "evidence" : variant === "gap" ? "suggestion" : "relevance";

  return (
    <div className="rounded-2xl border border-dark-600 bg-dark-800 p-6">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      <div className="space-y-3 stagger-children">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl bg-dark-900/50 border border-dark-700 p-4">
            <div className="mb-2">
              <SkillBadge label={item[labelKey as keyof MatchItem] as string} variant={variant} />
            </div>
            <p className="text-gray-400 text-sm">
              {item[detailKey as keyof MatchItem] as string}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
