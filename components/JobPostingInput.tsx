"use client";

interface JobPostingInputProps {
  value: string;
  onChange: (value: string) => void;
  jobIndex?: number;
  onRemove?: () => void;
  showRemove?: boolean;
  error?: string | null;
}

export default function JobPostingInput({
  value,
  onChange,
  jobIndex,
  onRemove,
  showRemove,
  error,
}: JobPostingInputProps) {
  const label = jobIndex !== undefined ? `Job Posting #${jobIndex + 1}` : "Job Posting";

  return (
    <div className="rounded-2xl border border-dark-600 bg-dark-800 p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-semibold">{label}</h2>
        {showRemove && onRemove && (
          <button
            onClick={onRemove}
            className="text-gray-500 hover:text-red-400 text-sm transition"
          >
            Remove
          </button>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste a job posting URL or the full description..."
        rows={4}
        className="w-full bg-dark-900 border border-dark-600 rounded-xl p-4 text-gray-200 text-sm placeholder-gray-500 resize-y focus:outline-none focus:ring-2 focus:ring-purple-brand/50 focus:border-purple-brand transition"
      />
      {error && (
        <p className="text-red-400 text-xs mt-2">{error}</p>
      )}
    </div>
  );
}
