"use client";

import FitScoreGauge from "./FitScoreGauge";
import RecruiterSummary from "./RecruiterSummary";
import MatchSection from "./MatchSection";
import ResumeTweaks from "./ResumeTweaks";

export interface AnalysisData {
  fitScore: number;
  recruiterSummary: string;
  strongMatches: { skill: string; evidence: string }[];
  gaps: { requirement: string; suggestion: string }[];
  hiddenStrengths: { strength: string; relevance: string }[];
  resumeTweaks: string[];
}

interface AnalysisResultProps {
  data: AnalysisData;
  label?: string;
}

export default function AnalysisResult({ data, label }: AnalysisResultProps) {
  return (
    <div className="animate-fade-in-up space-y-6">
      {label && (
        <h2 className="text-white font-semibold text-lg">{label}</h2>
      )}

      {/* Score + Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-start">
        <div className="rounded-2xl border border-dark-600 bg-dark-800 p-6 flex justify-center">
          <FitScoreGauge score={data.fitScore} />
        </div>
        <RecruiterSummary summary={data.recruiterSummary} />
      </div>

      {/* Matches & Gaps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MatchSection
          title="Strong Matches"
          icon={
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          }
          items={data.strongMatches}
          variant="match"
        />
        <MatchSection
          title="Gaps to Address"
          icon={
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          items={data.gaps}
          variant="gap"
        />
      </div>

      {/* Hidden Strengths */}
      <MatchSection
        title="Hidden Strengths"
        icon={
          <svg className="w-5 h-5 text-purple-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        }
        items={data.hiddenStrengths}
        variant="strength"
      />

      {/* Resume Tweaks */}
      <ResumeTweaks tweaks={data.resumeTweaks} />
    </div>
  );
}
