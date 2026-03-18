/**
 * Client-side PII removal via regex chain.
 * Runs before resume text is sent to the API.
 * Not perfect — but good enough for a demo to strip obvious PII.
 */
export function stripPII(text: string): string {
  let cleaned = text;

  // Email addresses
  cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email removed]');

  // URLs (http/https/www)
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '[url removed]');
  cleaned = cleaned.replace(/www\.[^\s]+/g, '[url removed]');

  // SSN patterns (XXX-XX-XXXX)
  cleaned = cleaned.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[ssn removed]');

  // Phone numbers (various formats)
  cleaned = cleaned.replace(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[phone removed]');

  // Street addresses (number + street name + type)
  cleaned = cleaned.replace(
    /\b\d+\s+[A-Za-z]+\s+(Street|St|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Lane|Ln|Road|Rd|Court|Ct|Way|Place|Pl|Circle|Cir)\b\.?/gi,
    '[address removed]'
  );

  // Zip codes (5 digit or 5+4)
  cleaned = cleaned.replace(/\b\d{5}(-\d{4})?\b/g, '[zip removed]');

  // Clean up multiple replacements on same line
  cleaned = cleaned.replace(/(\[(?:email|url|ssn|phone|address|zip) removed\]\s*){2,}/g, '[personal info removed]');

  return cleaned;
}
