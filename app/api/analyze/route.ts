import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { checkLimit, consume, getRemaining } from "@/lib/rate-limiter";
import { CHRIS_RESUME } from "@/lib/chris-resume";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompts";

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

    // Consume rate limit only on success
    consume(ip);

    return NextResponse.json({
      result,
      remaining: getRemaining(ip),
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
