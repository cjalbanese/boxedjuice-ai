"use client";

interface RecruiterSummaryProps {
  summary: string;
}

export default function RecruiterSummary({ summary }: RecruiterSummaryProps) {
  return (
    <div className="rounded-2xl border border-dark-600 bg-dark-800 p-6">
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-purple-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Recruiter Perspective
      </h3>
      <p className="text-gray-300 leading-relaxed">{summary}</p>
    </div>
  );
}
