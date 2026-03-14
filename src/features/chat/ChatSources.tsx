import type { ChatMessageSources } from "@/features/chat/types";

type ChatSourcesProps = {
  sources: ChatMessageSources;
};

export function ChatSources({ sources }: ChatSourcesProps) {
  if (sources.videos.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 border-t pt-3" aria-label="Sources">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Sources</p>
      <ol className="space-y-1.5">
        {sources.videos.map((video, index) => (
          <li key={video.videoId} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
            <span className="shrink-0 text-muted-foreground">{index + 1}.</span>
            <span className="max-w-[200px] truncate font-medium" title={video.title}>
              {video.title}
            </span>
            <span className="flex flex-wrap gap-1">
              {video.timestamps.map((timestamp) => {
                const safeSeconds = Number.isFinite(timestamp.seconds)
                  ? Math.max(0, Math.floor(timestamp.seconds))
                  : 0;
                const href = `https://youtube.com/watch?v=${encodeURIComponent(video.youtubeVideoId)}&t=${safeSeconds}`;

                return (
                  <a
                    key={`${video.videoId}-${safeSeconds}`}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded bg-muted px-1.5 py-0.5 text-xs transition-colors hover:bg-muted/70"
                    aria-label={`Jump to ${timestamp.label} in ${video.title}`}
                  >
                    {timestamp.label}
                  </a>
                );
              })}
            </span>
          </li>
        ))}
      </ol>
      {sources.extraVideos > 0 ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          +{sources.extraVideos} more {sources.extraVideos === 1 ? "video" : "videos"} used
        </p>
      ) : null}
    </div>
  );
}
