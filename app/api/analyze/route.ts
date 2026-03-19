import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;
import { checkLimit, consume, getRemaining } from "@/lib/rate-limiter";
import { CHRIS_RESUME } from "@/lib/chris-resume";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompts";

function sanitize(str: string): string {
  return str
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

function sanitizeResult(result: Record<string, unknown>): Record<string, unknown> {
  return {
    fitScore: Math.round(Math.min(100, Math.max(0, result.fitScore as number))),
    recruiterSummary: sanitize(result.recruiterSummary as string),
    strongMatches: (result.strongMatches as { skill: string; evidence: string }[]).map((m) => ({
      skill: sanitize(m.skill),
      evidence: sanitize(m.evidence),
    })),
    gaps: (result.gaps as { requirement: string; suggestion: string }[]).map((g) => ({
      requirement: sanitize(g.requirement),
      suggestion: sanitize(g.suggestion),
    })),
    hiddenStrengths: (result.hiddenStrengths as { strength: string; relevance: string }[]).map((h) => ({
      strength: sanitize(h.strength),
      relevance: sanitize(h.relevance),
    })),
    resumeTweaks: (result.resumeTweaks as string[]).map(sanitize),
  };
}

function getIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

export async function GET(req: NextRequest) {
  const ip = getIP(req);
  return NextResponse.json({ remaining: getRemaining(ip) });
}

export async function POST(req: NextRequest) {
  const ip = getIP(req);

  const { allowed, remaining } = checkLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in 24 hours.", remaining: 0 },
      { status: 429 }
    );
  }

  let body: { resume?: string; jobPosting?: string; isDemo?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { jobPosting, isDemo } = body;
  const resume = isDemo ? CHRIS_RESUME : body.resume;

  if (!resume || !jobPosting) {
    return NextResponse.json(
      { error: "Both resume and job posting are required." },
      { status: 400 }
    );
  }

  if (resume.length > 15000 || jobPosting.length > 15000) {
    return NextResponse.json(
      { error: "Input too long. Keep resume and job posting under 15,000 characters each." },
      { status: 400 }
    );
  }

  // Reject junk content that isn't a real job posting
  if (
    jobPosting.length < 100 ||
    !/(responsibilities|requirements|qualifications|experience|about the role|what you.?ll do|who you are|apply|salary|compensation|benefits|skills)/i.test(jobPosting)
  ) {
    return NextResponse.json(
      { error: "This doesn't look like a job description. Please paste the full job posting text." },
      { status: 400 }
    );
  }

  const client = new Anthropic();

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: buildUserPrompt(resume, jobPosting) },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      // Try extracting JSON from markdown code fences
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        result = JSON.parse(match[1]);
      } else {
        throw new Error("Failed to parse Claude response as JSON");
      }
    }

    // Validate output shape before returning
    if (
      typeof result.fitScore !== "number" ||
      result.fitScore < 0 ||
      result.fitScore > 100 ||
      typeof result.recruiterSummary !== "string" ||
      !Array.isArray(result.strongMatches) ||
      !Array.isArray(result.gaps) ||
      !Array.isArray(result.hiddenStrengths) ||
      !Array.isArray(result.resumeTweaks)
    ) {
      throw new Error("Claude returned malformed analysis structure");
    }

    // Sanitize all string fields to prevent XSS
    const sanitized = sanitizeResult(result);

    // Consume rate limit only on success
    consume(ip);

    return NextResponse.json({
      result: sanitized,
      remaining: getRemaining(ip),
    });
  } catch (error) {
    console.error("Analysis error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Analysis failed: ${msg}` },
      { status: 500 }
    );
  }
}
