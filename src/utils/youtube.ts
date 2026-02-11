/**
 * YouTube URL parsing and YouTube Data API integration
 */

/**
 * Extract YouTube video ID from various URL formats
 *
 * @param url - YouTube URL
 * @returns Video ID or undefined if not a valid YouTube URL
 */
export function extractYouTubeVideoId(url: string): string | undefined {
  if (!url) return undefined;

  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  // youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  // youtube.com/v/VIDEO_ID
  const vMatch = url.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/);
  if (vMatch) return vMatch[1];

  return undefined;
}

/**
 * Check if a URL is a YouTube URL
 *
 * @param url - URL to check
 * @returns true if YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.includes('youtube.com') ||
    lowerUrl.includes('youtu.be')
  );
}

/**
 * Parse ISO 8601 duration (PT10M30S) to seconds
 *
 * @param isoDuration - ISO 8601 duration string
 * @returns Duration in seconds
 */
export function parseISODuration(isoDuration: string): number {
  if (!isoDuration) return 0;

  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Fetch video duration from YouTube Data API v3
 *
 * @param videoUrl - YouTube video URL
 * @param apiKey - YouTube Data API key
 * @returns Duration in seconds or null if failed
 */
export async function fetchYouTubeDuration(
  videoUrl: string,
  apiKey: string
): Promise<number | null> {
  const videoId = extractYouTubeVideoId(videoUrl);
  if (!videoId) {
    return null;
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${apiKey}`
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`YouTube API error: ${error}`);
    }

    const data = await response.json() as {
      items?: Array<{
        contentDetails?: {
          duration?: string;
        };
      }>;
    };

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const duration = data.items[0].contentDetails?.duration;
    if (!duration) {
      return null;
    }

    return parseISODuration(duration);
  } catch (error) {
    console.error('Failed to fetch YouTube duration:', error);
    return null;
  }
}
