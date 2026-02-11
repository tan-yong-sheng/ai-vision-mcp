/**
 * Duration parsing and formatting utilities
 * Supports various duration formats and converts to ISO 8601 duration strings
 */

/**
 * Parse duration string or number to ISO 8601 duration format (e.g., "40s", "150s")
 *
 * Supported formats:
 * - Numeric seconds: `40`, `120.5` → `"40s"`, `"120.5s"`
 * - With suffix: `"40s"`, `"2m"`, `"1.5h"` → `"40s"`, `"120s"`, `"5400s"`
 * - Combined: `"2m30s"`, `"1h30m20s"` → `"150s"`, `"5420s"`
 * - Time notation: `"00:02:30"`, `"1:30:45"` → `"150s"`, `"5445s"`
 * - Already formatted: `"40s"` → `"40s"` (pass-through)
 *
 * @param input - Duration as string or number
 * @returns ISO 8601 duration string (e.g., "40s") or undefined if invalid
 */
export function formatDuration(
  input: string | number | undefined
): string | undefined {
  if (input === undefined || input === null || input === '') {
    return undefined;
  }

  // Already in correct format (number followed by 's')
  if (
    typeof input === 'string' &&
    /^\d+(\.\d+)?s$/.test(input) &&
    !input.includes('m') &&
    !input.includes('h')
  ) {
    return input;
  }

  // Numeric seconds (including decimals)
  if (typeof input === 'number') {
    return input > 0 ? `${input}s` : undefined;
  }

  const trimmed = input.trim().toLowerCase();

  // Parse "2m30s" or "1h30m20s" format
  const durationMatch = trimmed.match(
    /^(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s?)?$/
  );
  if (durationMatch) {
    const hours = parseFloat(durationMatch[1] || '0');
    const minutes = parseFloat(durationMatch[2] || '0');
    const seconds = parseFloat(durationMatch[3] || '0');
    const total = hours * 3600 + minutes * 60 + seconds;
    return total > 0 ? `${total}s` : undefined;
  }

  // Parse "00:02:30" or "1:30:45" timestamp format
  const timeMatch = trimmed.match(/^(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)$/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1] || '0', 10);
    const minutes = parseInt(timeMatch[2], 10);
    const seconds = parseFloat(timeMatch[3]);
    const total = hours * 3600 + minutes * 60 + seconds;
    return total > 0 ? `${total}s` : undefined;
  }

  // Try parsing as plain number string
  const numericValue = parseFloat(trimmed);
  if (!isNaN(numericValue) && numericValue > 0) {
    return `${numericValue}s`;
  }

  return undefined;
}

/**
 * Validate that startOffset is before endOffset
 *
 * @param startOffset - Start time (in seconds or duration string)
 * @param endOffset - End time (in seconds or duration string)
 * @returns true if valid (start < end), false otherwise
 */
export function validateClipOrder(
  startOffset: string | number | undefined,
  endOffset: string | number | undefined
): boolean {
  if (startOffset === undefined || endOffset === undefined) {
    return true; // If one is missing, can't validate order
  }

  const start = parseDurationToSeconds(startOffset);
  const end = parseDurationToSeconds(endOffset);

  if (start === undefined || end === undefined) {
    return true; // If parsing failed, can't validate
  }

  return start < end;
}

/**
 * Parse duration to seconds (number)
 *
 * @param input - Duration as string or number
 * @returns Duration in seconds, or undefined if invalid
 */
export function parseDurationToSeconds(
  input: string | number | undefined
): number | undefined {
  if (input === undefined || input === null) {
    return undefined;
  }

  if (typeof input === 'number') {
    return input > 0 ? input : undefined;
  }

  const formatted = formatDuration(input);
  if (!formatted) {
    return undefined;
  }

  // Extract number from "40s" format
  const match = formatted.match(/^(\d+(?:\.\d+)?)s$/);
  if (match) {
    return parseFloat(match[1]);
  }

  return undefined;
}
