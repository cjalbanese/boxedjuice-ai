"use client";

interface ResumeTweaksProps {
  tweaks: string[];
}

export default function ResumeTweaks({ tweaks }: ResumeTweaksProps) {
  return (
    <div className="rounded-2xl border border-dark-600 bg-dark-800 p-6">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Resume Tweaks
      </h3>
      <ul className="space-y-3 stagger-children">
        {tweaks.map((tweak, i) => (
          <li key={i} className="flex gap-3 text-gray-300 text-sm">
            <span className="shrink-0 w-6 h-6 rounded-full bg-dark-700 text-purple-glow flex items-center justify-center text-xs font-medium">
              {i + 1}
            </span>
            <span>{tweak}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
