"use client";

export default function Header() {
  return (
    <header className="text-center pt-12 pb-6 px-4">
      <div className="flex items-center justify-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-purple-brand flex items-center justify-center text-white font-bold text-lg">
          BJ
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          BoxedJuice<span className="text-purple-glow">.ai</span>
        </h1>
      </div>
      <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-4">
        The candidate side of AI recruiting — see how you actually stack up on AI profile crawlers
      </p>
      <p className="text-gray-500 text-sm max-w-xl mx-auto leading-relaxed">
        Recruiters use AI to evaluate you in seconds. This tool flips the lens &mdash; paste a job posting, get the same structured breakdown a hiring team would see, and know exactly where you stand.
      </p>
    </header>
  );
}
