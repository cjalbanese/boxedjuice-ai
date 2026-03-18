"use client";

import FitScoreGauge from "./FitScoreGauge";
import { AnalysisData } from "./AnalysisResult";

interface ComparisonTableProps {
  results: { jobSnippet: string; data: AnalysisData }[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export default function ComparisonTable({
  results,
  selectedIndex,
  onSelect,
}: ComparisonTableProps) {
  // Sort by fitScore descending for ranking
  const ranked = results
    .map((r, i) => ({ ...r, originalIndex: i }))
    .sort((a, b) => b.data.fitScore - a.data.fitScore);

  return (
    <div className="rounded-2xl border border-dark-600 bg-dark-800 p-6 animate-fade-in-up">
      <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-purple-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Job Comparison
      </h2>

      <div className="space-y-3">
        {ranked.map((item, rank) => {
          const isSelected = item.originalIndex === selectedIndex;
          const topMatches = item.data.strongMatches.slice(0, 3).map((m) => m.skill);
          const topGaps = item.data.gaps.slice(0, 2).map((g) => g.requirement);

          return (
            <button
              key={item.originalIndex}
              onClick={() => onSelect(item.originalIndex)}
              className={`w-full text-left rounded-xl p-4 border transition-all ${
                isSelected
                  ? "border-purple-brand bg-purple-brand/10"
                  : "border-dark-600 bg-dark-900/50 hover:border-dark-500"
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Rank badge */}
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  rank === 0 ? "bg-emerald-900/50 text-emerald-300" :
                  rank === 1 ? "bg-amber-900/50 text-amber-300" :
                  "bg-dark-700 text-gray-400"
                }`}>
                  {rank + 1}
                </div>

                {/* Score gauge */}
                <div className="shrink-0">
                  <FitScoreGauge score={item.data.fitScore} compact />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate mb-1">
                    {item.jobSnippet}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {topMatches.map((skill) => (
                      <span key={skill} className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-300 border border-emerald-800/50">
                        {skill}
                      </span>
                    ))}
                    {topGaps.map((gap) => (
                      <span key={gap} className="text-[11px] px-2 py-0.5 rounded-full bg-red-900/30 text-red-300 border border-red-800/50">
                        {gap}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <svg className={`w-5 h-5 shrink-0 transition-colors ${isSelected ? "text-purple-glow" : "text-gray-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
