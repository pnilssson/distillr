import { z } from "zod";

export const loginEmailSchema = z.object({
  email: z.email("Enter a valid email address."),
});

export type LoginEmailInput = z.infer<typeof loginEmailSchema>;
