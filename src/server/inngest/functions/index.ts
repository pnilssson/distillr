import { sourceAdded } from "@/server/inngest/functions/source-added";
import { videoIngest } from "@/server/inngest/functions/video-ingest";

export const inngestFunctions = [sourceAdded, videoIngest];
