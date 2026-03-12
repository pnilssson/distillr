import { NextResponse } from "next/server";

import { withApiAuth } from "@/server/core/auth/api";
import { getLibraryById } from "@/server/libraries/queries";
import { getLibraryVideosProgress } from "@/server/videos/queries";

type VideosRouteProps = {
  params: Promise<{ libraryId: string }>;
};

export const GET = withApiAuth<VideosRouteProps>(async (_request, { params, user }) => {
  const { libraryId } = await params;

  const library = await getLibraryById(user.id, libraryId);
  if (!library) {
    return NextResponse.json({ error: "Library not found." }, { status: 404 });
  }

  const progress = await getLibraryVideosProgress(user.id, libraryId);

  const responseVideos = progress.videos.map((video) => ({
    id: video.id,
    title: video.title,
    thumbnailUrl: video.thumbnailUrl,
    channelName: video.channelName,
    status: video.status,
    failureReason: sanitizeUserFacingFailureReason(video.failureReason),
    publishedAt: video.publishedAt.toISOString(),
    updatedAt: video.updatedAt.toISOString(),
  }));

  return NextResponse.json({
    videos: responseVideos,
    counts: progress.counts,
    hasInFlight: progress.hasInFlight,
    isProcessing: progress.isProcessing,
    isSettled: progress.isSettled,
  });
});

function sanitizeUserFacingFailureReason(reason: string | null): string | null {
  if (!reason) {
    return null;
  }

  const normalized = reason.toLowerCase();

  if (
    normalized.includes("no transcript") ||
    normalized.includes("no caption") ||
    normalized.includes("captions are disabled") ||
    normalized.includes("transcript is disabled") ||
    normalized.includes("zero chunks")
  ) {
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
