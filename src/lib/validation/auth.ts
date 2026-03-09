import { z } from "zod";

export const loginEmailSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

export type LoginEmailInput = z.infer<typeof loginEmailSchema>;
