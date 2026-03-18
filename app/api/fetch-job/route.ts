import { NextRequest, NextResponse } from "next/server";
import { validateExternalUrl, validateResolvedIPs } from "@/lib/url-validator";

export async function POST(req: NextRequest) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { url } = body;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const validation = validateExternalUrl(url);
  if (!validation.valid || !validation.parsed) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // DNS rebinding protection
  const dnsCheck = await validateResolvedIPs(validation.parsed.hostname);
  if (!dnsCheck.valid) {
    return NextResponse.json({ error: dnsCheck.error }, { status: 400 });
  }

  try {
    const res = await fetch(validation.parsed.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; BoxedJuice/1.0; job-posting-reader)",
        Accept: "text/html,application/xhtml+xml,text/plain",
      },
      signal: AbortSignal.timeout(10000),
      redirect: "manual",
    });

    // If redirect, validate the target too
    if ([301, 302, 307, 308].includes(res.status)) {
      const location = res.headers.get("location");
      if (location) {
        const redirectValidation = validateExternalUrl(
          new URL(location, validation.parsed).toString()
        );
        if (!redirectValidation.valid) {
          return NextResponse.json(
            { error: "Redirect to disallowed URL" },
            { status: 400 }
          );
        }
        // Follow the validated redirect
        const redirectRes = await fetch(redirectValidation.parsed!.toString(), {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; BoxedJuice/1.0; job-posting-reader)",
            Accept: "text/html,application/xhtml+xml,text/plain",
          },
          signal: AbortSignal.timeout(10000),
        });
        if (!redirectRes.ok) {
          return NextResponse.json(
            { error: `Failed to fetch (${redirectRes.status})` },
            { status: 502 }
          );
        }
        return processHtml(await redirectRes.text());
      }
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch (${res.status})` },
        { status: 502 }
      );
    }

    return processHtml(await res.text());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    .trim();
}

function processHtml(html: string) {
  // Try to extract from meta description first (works for JS-rendered sites like Ashby)
  const metaDesc =
    html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/)?.[1] ||
    html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/)?.[1];

  if (metaDesc && metaDesc.length > 200) {
    let text = decodeEntities(metaDesc);
    if (text.length > 15000) text = text.slice(0, 15000) + "\n\n[truncated]";
    return NextResponse.json({ text });
  }

  // Try JSON-LD structured data (common on Ashby, Lever, Greenhouse)
  const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  if (jsonLdMatch) {
    try {
      const ld = JSON.parse(jsonLdMatch[1]);
      if (ld.description && ld.description.length > 100) {
        const parts: string[] = [];
        if (ld.title) parts.push(ld.title);
        if (ld.hiringOrganization?.name) parts.push(`Company: ${ld.hiringOrganization.name}`);
        if (ld.jobLocation?.address) {
          const addr = ld.jobLocation.address;
          const loc = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean).join(", ");
          if (loc) parts.push(`Location: ${loc}`);
        }
        if (ld.employmentType) parts.push(`Type: ${Array.isArray(ld.employmentType) ? ld.employmentType.join(", ") : ld.employmentType}`);
        parts.push("");
        // Strip HTML tags from description (some sites include HTML in JSON-LD)
        const desc = ld.description
          .replace(/<\/?(p|br|div|li|ul|ol|h[1-6])[^>]*>/gi, "\n")
          .replace(/<[^>]+>/g, " ")
          .replace(/\n\s*\n/g, "\n\n")
          .trim();
        parts.push(desc);
        let text = decodeEntities(parts.join("\n"));
        if (text.length > 15000) text = text.slice(0, 15000) + "\n\n[truncated]";
        return NextResponse.json({ text });
      }
    } catch {
      // JSON-LD parse failed, fall through
    }
  }

  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
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

  if (text.length > 15000) {
    text = text.slice(0, 15000) + "\n\n[truncated]";
  }

  if (text.length < 50) {
    return NextResponse.json(
      { error: "Could not extract meaningful text from this page. Try pasting the job description directly." },
      { status: 422 }
    );
  }

  // Detect pages that didn't return actual job content
  const JUNK_PATTERNS = [
    // JS-rendered shells
    /you need to enable javascript/i,
    /please enable javascript/i,
    /this app requires javascript/i,
    /javascript is required/i,
    // Login / auth walls
    /sign.?in with google/i,
    /passwordless sign.?in/i,
    /log.?in to continue/i,
    /create an account/i,
    /sign up to view/i,
  ];

  const isJunk =
    JUNK_PATTERNS.some((p) => p.test(text)) ||
    text.length < 200 ||
    // If the text has no job-related keywords, it's probably not a job posting
    !/(responsibilities|requirements|qualifications|experience|about the role|what you.?ll do|who you are|apply|salary|compensation|benefits)/i.test(text);

  if (isJunk) {
    return NextResponse.json(
      { error: "Couldn't extract a job description from this page — it may require login or JavaScript to load. Please copy and paste the job description directly." },
      { status: 422 }
    );
  }

  return NextResponse.json({ text });
}
