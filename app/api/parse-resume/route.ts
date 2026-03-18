import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";
import mammoth from "mammoth";

// ---------- file parsing ----------

async function parsePDF(buffer: Buffer): Promise<string> {
  const { text } = await extractText(new Uint8Array(buffer));
  const joined = Array.isArray(text) ? text.join("\n") : String(text);
  return joined.trim() || "";
}

async function parseDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value?.trim() || "";
}

// ---------- profile fetching ----------

async function fetchGitHubProfile(username: string): Promise<string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "BoxedJuice/1.0",
  };

  const [userRes, reposRes] = await Promise.all([
    fetch(`https://api.github.com/users/${username}`, { headers }),
    fetch(
      `https://api.github.com/users/${username}/repos?sort=stars&per_page=15`,
      { headers }
    ),
  ]);

  if (!userRes.ok) throw new Error("GitHub user not found");

  const user = await userRes.json();
  const repos = reposRes.ok ? await reposRes.json() : [];

  const lines: string[] = [];
  lines.push(`GITHUB PROFILE: ${user.login}`);
  if (user.name) lines.push(`Name: ${user.name}`);
  if (user.bio) lines.push(`Bio: ${user.bio}`);
  if (user.company) lines.push(`Company: ${user.company}`);
  if (user.location) lines.push(`Location: ${user.location}`);
  if (user.blog) lines.push(`Website: ${user.blog}`);
  lines.push(`Public repos: ${user.public_repos}`);
  lines.push(`Followers: ${user.followers}`);
  lines.push("");

  if (Array.isArray(repos) && repos.length > 0) {
    lines.push("TOP REPOSITORIES:");
    for (const repo of repos) {
      const lang = repo.language ? ` [${repo.language}]` : "";
      const stars = repo.stargazers_count
        ? ` ★${repo.stargazers_count}`
        : "";
      const desc = repo.description ? ` — ${repo.description}` : "";
      lines.push(`• ${repo.name}${lang}${stars}${desc}`);
    }
    lines.push("");

    // Aggregate languages
    const langCounts: Record<string, number> = {};
    for (const repo of repos) {
      if (repo.language) {
        langCounts[repo.language] = (langCounts[repo.language] || 0) + 1;
      }
    }
    const sorted = Object.entries(langCounts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      lines.push(
        `Languages used: ${sorted.map(([l, c]) => `${l} (${c})`).join(", ")}`
      );
    }
  }

  return lines.join("\n");
}

async function fetchLinkedInProfile(url: string): Promise<string> {
  // LinkedIn blocks scraping — try to get what we can but mostly guide the user
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });

    if (!res.ok) throw new Error("Could not access LinkedIn page");

    const html = await res.text();

    // Try to extract from meta tags / JSON-LD (public profile snippets)
    const ogTitle = html.match(
      /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/
    )?.[1];
    const ogDesc = html.match(
      /<meta[^>]*property="og:description"[^>]*content="([^"]+)"/
    )?.[1];
    const metaDesc = html.match(
      /<meta[^>]*name="description"[^>]*content="([^"]+)"/
    )?.[1];

    const lines: string[] = ["LINKEDIN PROFILE"];
    if (ogTitle) lines.push(`Name/Title: ${ogTitle}`);
    if (ogDesc) lines.push(`Summary: ${ogDesc}`);
    else if (metaDesc) lines.push(`Summary: ${metaDesc}`);

    // Try JSON-LD
    const jsonLdMatch = html.match(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/
    );
    if (jsonLdMatch) {
      try {
        const ld = JSON.parse(jsonLdMatch[1]);
        if (ld.name) lines.push(`Name: ${ld.name}`);
        if (ld.jobTitle) lines.push(`Title: ${ld.jobTitle}`);
        if (ld.description) lines.push(`Description: ${ld.description}`);
        if (ld.worksFor?.name) lines.push(`Company: ${ld.worksFor.name}`);
        if (ld.alumniOf) {
          const schools = Array.isArray(ld.alumniOf)
            ? ld.alumniOf
            : [ld.alumniOf];
          for (const s of schools) {
            if (s.name) lines.push(`Education: ${s.name}`);
          }
        }
      } catch {
        // JSON-LD parse failed, continue with what we have
      }
    }

    if (lines.length <= 1) {
      throw new Error("minimal");
    }

    lines.push(
      "",
      "NOTE: LinkedIn limits what can be extracted from public profiles. For a more thorough analysis, paste your full LinkedIn profile text or upload your resume."
    );

    return lines.join("\n");
  } catch {
    return [
      "LINKEDIN PROFILE (limited extraction)",
      `URL: ${url}`,
      "",
      "LinkedIn restricts automated access to profiles. To get the best analysis:",
      "1. Go to your LinkedIn profile",
      '2. Click "More" → "Save to PDF" to download your profile',
      "3. Upload that PDF here instead",
      "",
      "Or copy-paste your profile summary, experience, and skills directly.",
    ].join("\n");
  }
}

async function fetchGenericProfile(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; BoxedJuice/1.0; profile-reader)",
      Accept: "text/html,application/xhtml+xml,text/plain",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);

  const html = await res.text();
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<\/?(div|p|br|h[1-6]|li|tr|section|article)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();

  if (text.length > 15000) text = text.slice(0, 15000) + "\n\n[truncated]";
  if (text.length < 50) throw new Error("Could not extract meaningful text");

  return text;
}

// ---------- URL classification ----------

function classifyUrl(url: string): "github" | "linkedin" | "other" {
  try {
    const u = new URL(url);
    if (u.hostname === "github.com" || u.hostname === "www.github.com")
      return "github";
    if (
      u.hostname === "linkedin.com" ||
      u.hostname === "www.linkedin.com" ||
      u.hostname.endsWith(".linkedin.com")
    )
      return "linkedin";
    return "other";
  } catch {
    return "other";
  }
}

function extractGitHubUsername(url: string): string | null {
  const match = url.match(/github\.com\/([a-zA-Z0-9_-]+)\/?$/);
  return match?.[1] || null;
}

// ---------- route handler ----------

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";

  // --- File upload ---
  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 }
        );
      }

      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File too large (max 5MB)" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const name = file.name.toLowerCase();
      let text: string;

      if (name.endsWith(".pdf")) {
        text = await parsePDF(buffer);
      } else if (name.endsWith(".docx")) {
        text = await parseDOCX(buffer);
      } else if (name.endsWith(".txt") || name.endsWith(".md")) {
        text = buffer.toString("utf-8");
      } else {
        return NextResponse.json(
          { error: "Unsupported file type. Use PDF, DOCX, or TXT." },
          { status: 400 }
        );
      }

      if (!text || text.length < 20) {
        return NextResponse.json(
          {
            error:
              "Could not extract text from file. Try pasting your resume directly.",
          },
          { status: 422 }
        );
      }

      return NextResponse.json({ text, source: "file" });
    } catch (err) {
      console.error("File parse error:", err);
      return NextResponse.json(
        { error: "Failed to parse file." },
        { status: 500 }
      );
    }
  }

  // --- URL fetch ---
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { url } = body;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const type = classifyUrl(url);
    let text: string;

    if (type === "github") {
      const username = extractGitHubUsername(url);
      if (!username) {
        return NextResponse.json(
          { error: "Could not extract GitHub username from URL" },
          { status: 400 }
        );
      }
      text = await fetchGitHubProfile(username);
    } else if (type === "linkedin") {
      text = await fetchLinkedInProfile(url);
    } else {
      text = await fetchGenericProfile(url);
    }

    return NextResponse.json({ text, source: type });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
