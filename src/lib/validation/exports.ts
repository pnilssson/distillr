import { z } from "zod";

import { EXPORT_FORMATS } from "@/lib/exports/types";

export const exportQuerySchema = z.object({
  format: z.enum(EXPORT_FORMATS),
});

export type ExportQueryInput = z.infer<typeof exportQuerySchema>;
