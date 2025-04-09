/**
 * Secure API Key Generation Utility
 * Generates keys in the format: sk-[random]-[timestamp]
 */

import { customAlphabet } from "nanoid";

// Configuration
const KEY_PREFIX = "sk";
const KEY_SEGMENT_LENGTH = 16;
const KEY_SEGMENTS = 2;
const ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // No 'I' or 'O' to avoid confusion

const nanoid = customAlphabet(ALPHABET, KEY_SEGMENT_LENGTH);

export function generateApiKey(): string {
  const segments = Array.from({ length: KEY_SEGMENTS }, () => nanoid());
  const timestamp = Math.floor(Date.now() / 1000)
    .toString(36)
    .toUpperCase();

  return `${KEY_PREFIX}_${segments.join("_")}_${timestamp}`;
}

export function validateApiKeyFormat(key: string): boolean {
  const pattern = new RegExp(
    `^${KEY_PREFIX}_[${ALPHABET}]{${KEY_SEGMENT_LENGTH}}` +
      `(_[${ALPHABET}]{${KEY_SEGMENT_LENGTH}})*` +
      `_[A-Z0-9]{6}$`,
  );
  return pattern.test(key);
}

// Helper for secure key masking in UIs
export function maskApiKey(key: string, visibleChars = 4): string {
  if (!validateApiKeyFormat(key)) return "invalid-key";

  const segments = key.split("_");
  const lastSegment = segments.pop() || "";
  const masked = segments
    .map(
      (seg) =>
        seg.slice(0, visibleChars) + "*".repeat(seg.length - visibleChars),
    )
    .join("_");

  return `${masked}_${lastSegment}`;
}
