import { z } from "zod";

export const createBillingCheckoutSchema = z.object({
  target: z.enum(["builder", "pro", "top_up_250"]),
  returnPath: z.string().trim().min(1).optional(),
});

export const createBillingPortalSchema = z.object({
  returnPath: z.string().trim().min(1).optional(),
});

export type CreateBillingCheckoutInput = z.infer<typeof createBillingCheckoutSchema>;
export type CreateBillingPortalInput = z.infer<typeof createBillingPortalSchema>;
