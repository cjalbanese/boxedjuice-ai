"use client";

import { useRef, useState, useCallback } from "react";
import { stripPII } from "@/lib/pii-stripper";

interface ResumeInputProps {
  value: string;
  onChange: (value: string) => void;
  isDemo: boolean;
}

function looksLikeUrl(text: string): boolean {
  const trimmed = text.trim();
  return /^https?:\/\/.+/i.test(trimmed) && !trimmed.includes("\n");
}

function getUrlLabel(url: string): string {
  try {
    const u = new URL(url.trim());
    if (u.hostname.includes("github.com")) return "Fetch GitHub Profile";
    if (u.hostname.includes("linkedin.com")) return "Fetch LinkedIn Profile";
    return "Fetch Profile";
  } catch {
    return "Fetch Profile";
  }
}

export default function ResumeInput({
  value,
  onChange,
  isDemo,
}: ResumeInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);
      setFileName(file.name);
      setSource(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/parse-resume", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to parse file.");
          setFileName(null);
          return;
        }

        onChange(stripPII(data.text));
        setSource(`Extracted from ${file.name}`);
      } catch {
        setError("Failed to upload file.");
        setFileName(null);
      } finally {
        setUploading(false);
      }
    },
    [onChange]
  );

  const handleFetchUrl = useCallback(async () => {
    setFetching(true);
    setError(null);
    setSource(null);

    try {
      const res = await fetch("/api/parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to fetch profile.");
        return;
      }

      onChange(stripPII(data.text));
      setSource(
        data.source === "github"
          ? "Imported from GitHub"
          : data.source === "linkedin"
            ? "Imported from LinkedIn"
            : "Imported from URL"
      );
    } catch {
      setError("Network error fetching profile.");
    } finally {
      setFetching(false);
    }
  }, [value, onChange]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  if (isDemo) {
    return (
      <div className="rounded-2xl border border-dark-600 bg-dark-800 p-6 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold">Resume</h2>
          <span className="rounded-full bg-dark-700 text-purple-glow text-xs px-3 py-1">
            Demo &mdash; Chris&apos;s Resume
          </span>
        </div>
        <p className="text-gray-400 text-sm">
          Using a pre-loaded sample resume. Switch to &quot;Try Your Own&quot;
          to upload yours.
        </p>
      </div>
    );
  }

  const isUrl = looksLikeUrl(value);

  return (
    <div className="rounded-2xl border border-dark-600 bg-dark-800 p-6 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-semibold">Your Resume</h2>
        <span className="rounded-full bg-emerald-900/50 text-emerald-300 text-xs px-3 py-1">
          PII auto-stripped
        </span>
      </div>

      {/* File upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-dark-600 rounded-xl p-4 mb-3 text-center hover:border-dark-500 transition cursor-pointer"
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm py-1">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Parsing {fileName}...
          </div>
        ) : (
          <div className="py-1">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Drop a file or click to upload
            </div>
            <p className="text-gray-600 text-xs mt-1">PDF, DOCX, or TXT (max 5MB)</p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-px bg-dark-600" />
        <span className="text-gray-600 text-xs">or paste text / link</span>
        <div className="flex-1 h-px bg-dark-600" />
      </div>

      {/* Textarea */}
      <textarea
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setError(null);
          setSource(null);
          setFileName(null);
        }}
        placeholder="Paste resume text, LinkedIn URL, or GitHub profile URL..."
        rows={4}
        className="w-full bg-dark-900 border border-dark-600 rounded-xl p-4 text-gray-200 text-sm placeholder-gray-500 resize-y focus:outline-none focus:ring-2 focus:ring-purple-brand/50 focus:border-purple-brand transition"
      />

      {/* URL fetch button */}
      {isUrl && (
        <button
          onClick={handleFetchUrl}
          disabled={fetching}
          className="mt-3 rounded-xl px-5 py-2.5 text-sm font-medium border border-dark-600 text-gray-200 hover:bg-dark-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          {fetching ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Fetching profile...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              {getUrlLabel(value)}
            </>
          )}
        </button>
      )}

      {/* Status messages */}
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      {source && (
        <p className="text-emerald-400 text-xs mt-2 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {source}
        </p>
      )}

      <p className="text-gray-500 text-xs mt-2">
        Emails, phone numbers, addresses, and other PII are automatically removed before sending.
      </p>
    </div>
  );
}
