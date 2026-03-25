import { z } from "zod";

export const createBillingCheckoutSchema = z.object({
  target: z.enum(["builder", "pro", "top_up_tier_1"]),
  returnPath: z.string().trim().min(1).optional(),
  source: z.enum(["checkout", "sidebar", "chat", "pricing", "export"]).optional(),
});

export const createBillingPortalSchema = z.object({
  returnPath: z.string().trim().min(1).optional(),
});

export type CreateBillingCheckoutInput = z.infer<typeof createBillingCheckoutSchema>;
export type CreateBillingPortalInput = z.infer<typeof createBillingPortalSchema>;
