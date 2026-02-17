/**
 * Normalizes a transaction description by stripping trailing unique identifiers.
 * This allows rule matching to work across transactions from the same merchant
 * that differ only by a unique reference code.
 *
 * Examples:
 *   "Direct Credit 342189 Kobble ST-ETFDYETYZWENI6B" -> "Direct Credit 342189 Kobble"
 *   "Direct Credit 342189 Kobble ST-G08BKDONK8JF7II" -> "Direct Credit 342189 Kobble"
 *   "Amazon.com" -> "Amazon.com" (unchanged, no trailing ID)
 */
export function normalizeDescription(description: string): string {
  let normalized = description.trim();
  let prev = '';

  // Iteratively strip trailing ID-like tokens (handles multiple suffixes)
  while (normalized !== prev) {
    prev = normalized;

    // Trailing PREFIX-CODE tokens (e.g., ST-ETFDYETYZWENI6B, REF-ABC123DEF, TXN-12345678)
    normalized = normalized.replace(/\s+[A-Za-z]{1,5}-[A-Za-z0-9]{6,}$/, '');

    // Trailing long mixed alphanumeric codes (8+ chars containing both letters and digits)
    normalized = normalized.replace(/\s+(?=\S*[A-Za-z])(?=\S*\d)[A-Za-z0-9]{8,}$/, '');

    // Trailing hash references (e.g., #ABC1234567)
    normalized = normalized.replace(/\s+#[A-Za-z0-9]{4,}$/, '');
  }

  return normalized;
}
