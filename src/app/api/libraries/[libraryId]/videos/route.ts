import { NextResponse } from "next/server";

import { sanitizeVideoFailureReasonForUser } from "@/server/core/errors/user-facing";
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
    youtubeVideoId: video.youtubeVideoId,
    title: video.title,
    thumbnailUrl: video.thumbnailUrl,
    channelName: video.channelName,
    status: video.status,
    failureReason: sanitizeVideoFailureReasonForUser(video.failureReason),
    publishedAt: video.publishedAt.toISOString(),
    createdAt: video.createdAt.toISOString(),
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
