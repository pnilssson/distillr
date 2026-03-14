import "server-only";

import type { FusedEvidence, ChatSourcesRollup } from "@/server/chat/types";

const MAX_SOURCE_VIDEOS = 5;
const MAX_TIMESTAMPS_PER_VIDEO = 5;

type GroupedVideo = {
  videoId: string;
  youtubeVideoId: string;
  title: string;
  bestScore: number;
  timestamps: Set<number>;
};

export function buildSourcesRollup(
  evidence: FusedEvidence[],
  options: { maxVideos?: number } = {},
): ChatSourcesRollup {
  const maxVideos = Math.max(1, Math.min(options.maxVideos ?? MAX_SOURCE_VIDEOS, MAX_SOURCE_VIDEOS));

  if (evidence.length === 0) {
    return {
      videos: [],
      extraVideos: 0,
    };
  }

  const grouped = new Map<string, GroupedVideo>();

  for (const item of evidence) {
    const existing = grouped.get(item.videoId);
    if (!existing) {
      const timestamps = new Set<number>();
      if (item.startSeconds !== null) {
        timestamps.add(Math.max(0, Math.floor(item.startSeconds)));
      }

      grouped.set(item.videoId, {
        videoId: item.videoId,
        youtubeVideoId: item.youtubeVideoId,
        title: item.videoTitle,
        bestScore: item.fusedScore,
        timestamps,
      });
      continue;
    }

    existing.bestScore = Math.max(existing.bestScore, item.fusedScore);
    if (item.startSeconds !== null) {
      existing.timestamps.add(Math.max(0, Math.floor(item.startSeconds)));
    }
  }

  const rankedVideos = [...grouped.values()].sort((a, b) => {
    if (b.bestScore !== a.bestScore) {
      return b.bestScore - a.bestScore;
    }

    return a.videoId.localeCompare(b.videoId);
  });

  const visibleVideos = rankedVideos.slice(0, maxVideos).map((video) => {
    const timestamps = [...video.timestamps]
      .sort((a, b) => a - b)
      .slice(0, MAX_TIMESTAMPS_PER_VIDEO)
      .map((seconds) => ({
        seconds,
        label: formatTimestampLabel(seconds),
        url: `https://youtube.com/watch?v=${video.youtubeVideoId}&t=${seconds}`,
      }));

    return {
      videoId: video.videoId,
      youtubeVideoId: video.youtubeVideoId,
      title: video.title,
      timestamps,
    };
  });

  return {
    videos: visibleVideos,
    extraVideos: Math.max(rankedVideos.length - visibleVideos.length, 0),
  };
}

export function formatTimestampLabel(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
