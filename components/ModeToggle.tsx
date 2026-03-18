"use client";

interface ModeToggleProps {
  isDemo: boolean;
  onChange: (isDemo: boolean) => void;
}

export default function ModeToggle({ isDemo, onChange }: ModeToggleProps) {
  return (
    <div className="flex justify-center mb-8">
      <div className="inline-flex rounded-full bg-dark-800 border border-dark-600 p-1">
        <button
          onClick={() => onChange(true)}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
            isDemo
              ? "bg-purple-brand text-white shadow-lg"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Demo Mode
        </button>
        <button
          onClick={() => onChange(false)}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
            !isDemo
              ? "bg-purple-brand text-white shadow-lg"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Try Your Own
        </button>
      </div>
    </div>
  );
}
