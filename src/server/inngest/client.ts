import "server-only";

import { EventSchemas, Inngest } from "inngest";

export const inngest = new Inngest({
  id: "distillr",
  schemas: new EventSchemas().fromRecord<{
    "source.added": {
      data: {
        userId: string;
        libraryId: string;
        sourceId: string;
      };
    };
    "video.ingest": {
      data: {
        userId: string;
        libraryId: string;
        sourceId: string;
        videoId: string;
        youtubeVideoId: string;
      };
    };
  }>(),
});
