/**
 * Utility for redacting sensitive information from URLs and error messages
 */

export function redactUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Return only scheme, host, and path (no query params or fragments)
    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
  } catch {
    // If URL parsing fails, return a generic redacted form
    return url.split('?')[0].split('#')[0];
  }
}

export function redactError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}
