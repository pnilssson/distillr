import "server-only";

export function isTranscriptUnavailableMessage(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("transcriptunavailableerror") ||
    normalized.includes("no transcript available") ||
    normalized.includes("no transcript") ||
    normalized.includes("no caption") ||
    normalized.includes("captions are disabled") ||
    normalized.includes("transcript is disabled") ||
    normalized.includes("transcript produced zero chunks") ||
    normalized.includes("no transcript segments")
  );
}

export function sanitizeVideoFailureReasonForUser(reason: string | null): string | null {
  if (!reason) {
    return null;
  }

  const normalized = reason.toLowerCase();

  if (isTranscriptUnavailableMessage(normalized)) {
    return "No transcript is available for this video.";
  }

  if (
    normalized.includes("timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("deadline")
  ) {
    return "Processing took too long. Please try again.";
  }

  if (
    normalized.includes("rate limit") ||
    normalized.includes("quota") ||
    normalized.includes("too many requests") ||
    normalized.includes("429")
  ) {
    return "Processing is temporarily busy. Please try again.";
  }

  return "This video could not be processed. Please try again.";
}
