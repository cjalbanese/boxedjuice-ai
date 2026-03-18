"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import ModeToggle from "@/components/ModeToggle";
import ResumeInput from "@/components/ResumeInput";
import JobPostingInput from "@/components/JobPostingInput";
import RateLimitBadge from "@/components/RateLimitBadge";
import AnalysisResult, { AnalysisData } from "@/components/AnalysisResult";
import ComparisonTable from "@/components/ComparisonTable";
import { stripPII } from "@/lib/pii-stripper";

const MAX_JOBS = 3;

function looksLikeUrl(text: string): boolean {
  const trimmed = text.trim();
  return /^https?:\/\/.+/i.test(trimmed) && !trimmed.includes("\n");
}

function extractSnippet(text: string): string {
  const lines = text.trim().split("\n").filter((l) => l.trim());
  for (const line of lines.slice(0, 5)) {
    const clean = line.trim();
    if (clean.length > 10 && clean.length < 120) return clean;
  }
  return text.trim().slice(0, 80) + "...";
}

interface JobSlot {
  text: string;
  result: AnalysisData | null;
  loading: boolean;
  error: string | null;
}

async function fetchJobUrl(url: string): Promise<string> {
  const res = await fetch("/api/fetch-job", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: url.trim() }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch job posting.");
  return data.text;
}

export default function Home() {
  const [isDemo, setIsDemo] = useState(true);
  const [resume, setResume] = useState("");
  const [jobs, setJobs] = useState<JobSlot[]>([
    { text: "", result: null, loading: false, error: null },
  ]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [selectedResult, setSelectedResult] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetch("/api/analyze")
      .then((r) => r.json())
      .then((d) => setRemaining(d.remaining))
      .catch(() => {});
  }, []);

  const updateJob = useCallback((index: number, update: Partial<JobSlot>) => {
    setJobs((prev) => prev.map((j, i) => (i === index ? { ...j, ...update } : j)));
  }, []);

  const handleAnalyzeAll = useCallback(async () => {
    const filledJobs = jobs.map((j, i) => ({ ...j, index: i })).filter((j) => j.text.trim());
    if (filledJobs.length === 0) return;

    setAnalyzing(true);

    // Clear previous results and errors for filled jobs
    for (const job of filledJobs) {
      updateJob(job.index, { loading: true, error: null, result: null });
    }

    // Process all jobs concurrently
    await Promise.all(
      filledJobs.map(async (job) => {
        try {
          // If it's a URL, fetch the content first
          let jobText = job.text;
          if (looksLikeUrl(jobText)) {
            try {
              jobText = await fetchJobUrl(jobText);
              updateJob(job.index, { text: jobText });
            } catch (err) {
              const msg = err instanceof Error ? err.message : "Failed to fetch URL.";
              updateJob(job.index, { error: msg, loading: false });
              return;
            }
          }

          const body: Record<string, unknown> = {
            jobPosting: jobText,
            isDemo,
          };
          if (!isDemo) {
            body.resume = stripPII(resume);
          }

          const res = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          const data = await res.json();

          if (!res.ok) {
            updateJob(job.index, { error: data.error || "Something went wrong.", loading: false });
            if (data.remaining !== undefined) setRemaining(data.remaining);
            return;
          }

          updateJob(job.index, { result: data.result, loading: false });
          setRemaining(data.remaining);
        } catch {
          updateJob(job.index, { error: "Network error. Please try again.", loading: false });
        }
      })
    );

    // Select the first completed result
    setSelectedResult(filledJobs[0].index);
    setAnalyzing(false);
  }, [isDemo, resume, jobs, updateJob]);

  const addJob = useCallback(() => {
    if (jobs.length < MAX_JOBS) {
      setJobs((prev) => [...prev, { text: "", result: null, loading: false, error: null }]);
    }
  }, [jobs.length]);

  const removeJob = useCallback(
    (index: number) => {
      setJobs((prev) => prev.filter((_, i) => i !== index));
      if (selectedResult >= index && selectedResult > 0) {
        setSelectedResult((s) => s - 1);
      }
    },
    [selectedResult]
  );

  const disabled = remaining === 0 || (!isDemo && !resume.trim());
  const hasAnyText = jobs.some((j) => j.text.trim());
  const completedResults = jobs
    .map((j, i) => (j.result ? { jobSnippet: extractSnippet(j.text), data: j.result, index: i } : null))
    .filter(Boolean) as { jobSnippet: string; data: AnalysisData; index: number }[];
  const anyLoading = jobs.some((j) => j.loading);
  const filledCount = jobs.filter((j) => j.text.trim()).length;

  return (
    <main className="min-h-screen pb-16">
      <div className="max-w-3xl mx-auto px-4">
        <Header />
        <ModeToggle isDemo={isDemo} onChange={setIsDemo} />
        <RateLimitBadge remaining={remaining} />

        <ResumeInput value={resume} onChange={setResume} isDemo={isDemo} />

        {/* Job posting inputs */}
        <div className="space-y-4 mb-4">
          {jobs.map((job, i) => (
            <JobPostingInput
              key={i}
              value={job.text}
              onChange={(text) => updateJob(i, { text })}
              jobIndex={jobs.length > 1 ? i : undefined}
              onRemove={() => removeJob(i)}
              showRemove={jobs.length > 1}
              error={job.error}
            />
          ))}

          {jobs.length < MAX_JOBS && (
            <button
              onClick={addJob}
              className="w-full rounded-xl border-2 border-dashed border-dark-600 hover:border-dark-500 py-3 text-gray-500 hover:text-gray-300 text-sm font-medium transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Compare with another job posting {jobs.length > 1 ? `(${MAX_JOBS - jobs.length} remaining)` : ""}
            </button>
          )}
        </div>

        {/* Single CTA */}
        <button
          onClick={handleAnalyzeAll}
          disabled={disabled || analyzing || !hasAnyText}
          className="w-full rounded-xl px-6 py-3.5 font-medium bg-purple-brand text-white hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mb-6 text-lg"
        >
          {analyzing ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing {filledCount > 1 ? `${filledCount} jobs` : "job fit"}...
            </>
          ) : (
            filledCount > 1 ? `Analyze ${filledCount} Jobs` : "Analyze Job Fit"
          )}
        </button>

        {/* Loading skeleton */}
        {anyLoading && (
          <div className="space-y-4 mb-6">
            <div className="rounded-2xl border border-dark-600 bg-dark-800 p-6">
              <div className="flex items-start gap-6">
                <div className="w-32 h-32 rounded-full shimmer shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-3/4 shimmer rounded" />
                  <div className="h-4 w-full shimmer rounded" />
                  <div className="h-4 w-2/3 shimmer rounded" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-dark-600 bg-dark-800 p-6 space-y-3">
                <div className="h-4 w-1/2 shimmer rounded" />
                <div className="h-16 shimmer rounded-xl" />
                <div className="h-16 shimmer rounded-xl" />
              </div>
              <div className="rounded-2xl border border-dark-600 bg-dark-800 p-6 space-y-3">
                <div className="h-4 w-1/2 shimmer rounded" />
                <div className="h-16 shimmer rounded-xl" />
                <div className="h-16 shimmer rounded-xl" />
              </div>
            </div>
          </div>
        )}

        {/* Comparison table (when 2+ results) */}
        {completedResults.length >= 2 && (
          <div className="mb-6">
            <ComparisonTable
              results={completedResults.map((r) => ({ jobSnippet: r.jobSnippet, data: r.data }))}
              selectedIndex={selectedResult}
              onSelect={(i) => setSelectedResult(completedResults[i].index)}
            />
          </div>
        )}

        {/* Selected result detail */}
        {completedResults.length > 0 && !anyLoading && (
          <AnalysisResult
            data={jobs[selectedResult]?.result || completedResults[0].data}
            label={completedResults.length >= 2
              ? `Details: ${extractSnippet(jobs[selectedResult]?.text || jobs[completedResults[0].index].text)}`
              : undefined}
          />
        )}

        {/* Footer */}
        <footer className="text-center mt-16 text-gray-600 text-xs space-y-1">
          <p>Built by Chris Albanese as a portfolio project</p>
          <p>
            Inspired by{" "}
            <span className="text-gray-500">Juicebox.ai</span>
            {" "}&mdash; this is an independent project, not affiliated with Juicebox
          </p>
        </footer>
      </div>
    </main>
  );
}
