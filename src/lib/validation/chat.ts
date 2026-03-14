import { z } from "zod";

export const createChatSessionSchema = z.object({}).strict().optional().default({});

export const sendChatMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty.")
    .max(4000, "Message must be 4000 characters or less."),
  mode: z.enum(["auto", "library", "chat"]).optional().default("auto"),
});

export const listChatMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().datetime({ offset: true }).optional(),
});

export type CreateChatSessionInput = z.infer<typeof createChatSessionSchema>;
export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;
export type ListChatMessagesQueryInput = z.infer<typeof listChatMessagesQuerySchema>;
