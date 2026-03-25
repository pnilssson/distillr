import { z } from "zod";

import { EXPORT_FORMATS, EXPORT_VARIANTS } from "@/lib/exports/types";

export const exportQuerySchema = z.object({
  format: z.enum(EXPORT_FORMATS),
  variant: z.enum(EXPORT_VARIANTS).optional().default("raw"),
});

export type ExportQueryInput = z.infer<typeof exportQuerySchema>;
