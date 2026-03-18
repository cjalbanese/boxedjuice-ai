/**
 * SSRF protection — block requests to internal/private IPs and non-HTTP protocols.
 * Includes DNS resolution to prevent rebinding attacks.
 */

import { resolve4, resolve6 } from "dns/promises";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "metadata.google.internal",
  "169.254.169.254", // cloud metadata endpoints
]);

const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^127\./,
  /^0\./,
  /^fc00:/i,
  /^fd/i,
  /^fe80:/i,
];

function isPrivateIP(ip: string): boolean {
  return PRIVATE_IP_RANGES.some((range) => range.test(ip));
}

/** Synchronous URL structure validation (no DNS). */
export function validateExternalUrl(url: string): { valid: boolean; error?: string; parsed?: URL } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: "Invalid URL" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { valid: false, error: "Only HTTP/HTTPS URLs are allowed" };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { valid: false, error: "This URL is not allowed" };
  }

  for (const range of PRIVATE_IP_RANGES) {
    if (range.test(hostname)) {
      return { valid: false, error: "This URL is not allowed" };
    }
  }

  // Block URLs with credentials
  if (parsed.username || parsed.password) {
    return { valid: false, error: "URLs with credentials are not allowed" };
  }

  return { valid: true, parsed };
}

/** Resolve DNS and verify all IPs are public. Call after validateExternalUrl. */
export async function validateResolvedIPs(hostname: string): Promise<{ valid: boolean; error?: string }> {
  // If hostname is already an IP, just check it directly
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.startsWith("[")) {
    if (isPrivateIP(hostname)) {
      return { valid: false, error: "This URL is not allowed" };
    }
    return { valid: true };
  }

  try {
    const ips: string[] = [];
    // Resolve both A and AAAA records; either may fail (e.g. no IPv6)
    const [v4, v6] = await Promise.allSettled([resolve4(hostname), resolve6(hostname)]);
    if (v4.status === "fulfilled") ips.push(...v4.value);
    if (v6.status === "fulfilled") ips.push(...v6.value);

    if (ips.length === 0) {
      return { valid: false, error: "Could not resolve hostname" };
    }

    for (const ip of ips) {
      if (isPrivateIP(ip) || BLOCKED_HOSTNAMES.has(ip)) {
        return { valid: false, error: "This URL is not allowed" };
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Could not resolve hostname" };
  }
}
