import "server-only";

import * as Sentry from "@sentry/nextjs";
import { getEncoding } from "js-tiktoken";
import { consumeStream, type FinishReason, type UIMessage } from "ai";

import { checkAndDeductCredits } from "@/server/billing/credits";
import { fuseRetrievalCandidates } from "@/server/chat/fusion";
import {
  classifyChatIntentRoute,
  rewriteChatQueryForRetrieval,
  streamAssistantResponse,
} from "@/server/chat/ai";
import {
  getChatSessionById,
  insertAssistantMessage,
  insertUserMessage,
  listChatMessages,
  updateSessionAfterMessage,
} from "@/server/chat/queries";
import { runHybridRetrieval } from "@/server/chat/retrieval";
import { buildSourcesRollup } from "@/server/chat/sources";
import type {
  ChatEffectiveMode,
  ChatMessageListItem,
  ChatRequestMode,
  ChatSourcesRollup,
  FusedEvidence,
} from "@/server/chat/types";
import { captureServerEvent } from "@/server/core/analytics/posthog";
import { isAppError, AppError } from "@/server/core/errors/app-error";
import { embedTexts } from "@/server/core/ai/embeddings";
import { getModel, type ModelAlias } from "@/server/core/ai/models";
import type { ChatModelId } from "@/lib/chat-models";
import { inngest } from "@/server/inngest/client";

const encoder = getEncoding("cl100k_base");

const MAX_HISTORY_MESSAGES = 12;
const HISTORY_TOKEN_BUDGET = 3000;
const RETRIEVAL_CONTEXT_TOKEN_BUDGET = 7000;

type ChatMessageMetadata = {
  sources?: ChatSourcesRollup;
  status?: "completed" | "aborted" | "failed";
  effectiveMode?: ChatEffectiveMode;
};

type StreamChatMessageParams = {
  userId: string;
  userEmail: string | null;
  userName?: string | null;
  libraryId: string;
  sessionId: string;
  content: string;
  mode: ChatRequestMode;
  model: ChatModelId;
  abortSignal?: AbortSignal;
};

export async function streamChatMessage(params: StreamChatMessageParams): Promise<Response> {
  const session = await getChatSessionById(params.userId, params.libraryId, params.sessionId);
  if (!session) {
    throw new AppError({
      code: "CHAT_SESSION_NOT_FOUND",
      userMessage: "Chat session not found.",
      httpStatus: 404,
    });
  }

  const isFirstMessage = await checkIfSessionHasNoMessages(
    params.userId,
    params.libraryId,
    params.sessionId,
  );
  const generationModelAlias = params.model as ModelAlias;
  const generationModel = getModel(generationModelAlias);

  try {
    await checkAndDeductCredits({
      userId: params.userId,
      userEmail: params.userEmail,
      userName: params.userName,
      operation: "chat_message",
      modelId: generationModel.modelId,
      modelAlias: generationModelAlias,
      requiredCredits: 1,
    });
  } catch (error) {
    if (isAppError(error) && error.code === "INSUFFICIENT_CREDITS") {
      await captureServerEvent(params.userId, "upgrade_prompt_shown", {
        library_id: params.libraryId,
        source: "chat",
      });
    }

    throw error;
  }

  const userMessage = await insertUserMessage({
    userId: params.userId,
    libraryId: params.libraryId,
    sessionId: params.sessionId,
    content: params.content,
    requestedMode: params.mode,
  });

  if (!userMessage) {
    throw new AppError({
      code: "CHAT_MESSAGE_INSERT_FAILED",
      userMessage: "Could not send this message. Please try again.",
      httpStatus: 500,
    });
  }

  if (isFirstMessage && session.title === "New chat") {
    await updateSessionAfterMessage(
      params.userId,
      params.libraryId,
      params.sessionId,
      truncateTitle(params.content),
      userMessage.createdAt,
    );
  }

  const historyForRouting = await getHistoryForRewrite({
    userId: params.userId,
    libraryId: params.libraryId,
    sessionId: params.sessionId,
  });
  const effectiveMode = await resolveEffectiveMode({
    userId: params.userId,
    requestedMode: params.mode,
    question: params.content,
    history: historyForRouting,
  });

  let contextSelection: { context: string; selectedEvidence: FusedEvidence[] } = {
    context: "",
    selectedEvidence: [],
  };
  let fusion: { evidence: FusedEvidence[]; isWeakEvidence: boolean } = {
    evidence: [],
    isWeakEvidence: false,
  };
  let sourcesRollup: ChatSourcesRollup | null = null;

  if (effectiveMode === "library") {
    const rewrittenQuery = await rewriteChatQueryForRetrieval({
      userId: params.userId,
      question: params.content,
      history: historyForRouting,
    });

    const embeddingInputs =
      rewrittenQuery === params.content ? [params.content] : [params.content, rewrittenQuery];
    const embeddings = await embedTexts(params.userId, embeddingInputs, "chat_query_embeddings");
    const queryEmbedding = mergeEmbeddings(embeddings);

    const retrievalCandidates = await runHybridRetrieval({
      userId: params.userId,
      libraryId: params.libraryId,
      query: rewrittenQuery,
      embedding: queryEmbedding,
    });

    fusion = fuseRetrievalCandidates(retrievalCandidates);
    contextSelection = buildRetrievalContext(fusion.evidence, RETRIEVAL_CONTEXT_TOKEN_BUDGET);
    const builtSourcesRollup = await buildSourcesRollup({
      userId: params.userId,
      libraryId: params.libraryId,
      evidence: contextSelection.selectedEvidence,
    });

    sourcesRollup = builtSourcesRollup.items.length > 0 ? builtSourcesRollup : null;
  }

  const messagesForModel = await getMessagesForModel({
    userId: params.userId,
    libraryId: params.libraryId,
    sessionId: params.sessionId,
    latestUserMessageId: userMessage.id,
  });

  const streamResult = await streamAssistantResponse({
    userId: params.userId,
    libraryId: params.libraryId,
    sessionId: params.sessionId,
    modelAlias: generationModelAlias,
    messages: messagesForModel,
    retrievalContext: contextSelection.context,
    assistantMode: effectiveMode,
    isWeakEvidence: effectiveMode === "library" ? fusion.isWeakEvidence : false,
    abortSignal: params.abortSignal,
    onFinish: async ({ text, totalUsage, finishReason }) => {
      try {
        const status = mapFinishReasonToMessageStatus(finishReason);

        const insertedAssistantMessage = await insertAssistantMessage({
          userId: params.userId,
          libraryId: params.libraryId,
          sessionId: params.sessionId,
          content: text,
          model: generationModel.modelId,
          status,
          effectiveMode,
          inputTokens: totalUsage.inputTokens ?? null,
          outputTokens: totalUsage.outputTokens ?? null,
          totalTokens: totalUsage.totalTokens ?? null,
          sources: sourcesRollup,
          evidence: fusion.evidence,
        });

        const lastMessageAt = insertedAssistantMessage?.createdAt ?? new Date();
        await updateSessionAfterMessage(
          params.userId,
          params.libraryId,
          params.sessionId,
          undefined,
          lastMessageAt,
        );

        const totalTokens = totalUsage.totalTokens ?? 0;

        if (
          insertedAssistantMessage &&
          totalTokens > 0 &&
          (status === "completed" || status === "aborted")
        ) {
          try {
            await inngest.send({
              name: "billing.usage.chat.record",
              data: {
                userId: params.userId,
                libraryId: params.libraryId,
                sessionId: params.sessionId,
                assistantMessageId: insertedAssistantMessage.id,
                modelId: generationModel.modelId,
                inputTokens: totalUsage.inputTokens ?? 0,
                outputTokens: totalUsage.outputTokens ?? 0,
                totalTokens,
                cachedInputTokens: totalUsage.cachedInputTokens,
              },
            });
          } catch (billingDispatchError) {
            Sentry.captureException(billingDispatchError, {
              tags: {
                area: "chat.billing_usage_dispatch",
              },
              extra: {
                userId: params.userId,
                libraryId: params.libraryId,
                sessionId: params.sessionId,
                messageId: insertedAssistantMessage.id,
              },
            });
          }
        }

        if (status === "completed" && insertedAssistantMessage) {
          await captureServerEvent(params.userId, "chat_message_sent", {
            library_id: params.libraryId,
            session_id: params.sessionId,
          });
        }
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            area: "chat.on_finish",
          },
          extra: {
            userId: params.userId,
            libraryId: params.libraryId,
            sessionId: params.sessionId,
            finishReason,
          },
        });
      }
    },
  });

  return streamResult.toUIMessageStreamResponse<UIMessage<ChatMessageMetadata>>({
    messageMetadata: ({ part }) => {
      if (part.type === "finish") {
        return {
          sources: sourcesRollup ?? undefined,
          effectiveMode,
        };
      }

      return undefined;
    },
    consumeSseStream: consumeStream,
    onError: () => "Could not generate a response right now. Please try again.",
  });
}

async function checkIfSessionHasNoMessages(userId: string, libraryId: string, sessionId: string): Promise<boolean> {
  const result = await listChatMessages(userId, libraryId, sessionId, { limit: 1 });
  return result.messages.length === 0;
}

async function getHistoryForRewrite(params: {
  userId: string;
  libraryId: string;
  sessionId: string;
}): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const history = await listChatMessages(params.userId, params.libraryId, params.sessionId, { limit: 8 });

  return history.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

async function getMessagesForModel(params: {
  userId: string;
  libraryId: string;
  sessionId: string;
  latestUserMessageId: string;
}): Promise<UIMessage<ChatMessageMetadata>[]> {
  const history = await listChatMessages(params.userId, params.libraryId, params.sessionId, {
    limit: 100,
  });

  const latestMessageIndex = history.messages.findIndex((message) => message.id === params.latestUserMessageId);
  if (latestMessageIndex < 0) {
    throw new AppError({
      code: "CHAT_HISTORY_MISSING",
      userMessage: "Could not send this message. Please try again.",
      httpStatus: 500,
    });
  }

  const priorMessages = history.messages.slice(0, latestMessageIndex).slice(-MAX_HISTORY_MESSAGES);
  const latestMessage = history.messages[latestMessageIndex];

  const trimmedMessages = trimMessagesToTokenBudget([...priorMessages, latestMessage], HISTORY_TOKEN_BUDGET);

  return trimmedMessages.map(toUIMessage);
}

function trimMessagesToTokenBudget(messages: ChatMessageListItem[], tokenBudget: number): ChatMessageListItem[] {
  const queue = [...messages];

  while (queue.length > 1 && countMessagesTokens(queue) > tokenBudget) {
    queue.shift();
  }

  return queue;
}

function toUIMessage(message: ChatMessageListItem): UIMessage<ChatMessageMetadata> {
  return {
    id: message.id,
    role: message.role,
    parts: [
      {
        type: "text",
        text: message.content,
      },
    ],
    metadata:
      message.sources || message.status === "aborted" || message.effectiveMode
        ? {
            sources: message.sources ?? undefined,
            status: message.status,
            effectiveMode: message.effectiveMode ?? undefined,
          }
        : undefined,
  };
}

async function resolveEffectiveMode(params: {
  userId: string;
  requestedMode: ChatRequestMode;
  question: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<ChatEffectiveMode> {
  if (params.requestedMode === "library" || params.requestedMode === "chat") {
    return params.requestedMode;
  }

  try {
    const route = await classifyChatIntentRoute({
      userId: params.userId,
      question: params.question,
      history: params.history,
    });

    return route === "chat_only" ? "chat" : "library";
  } catch {
    return "library";
  }
}

function buildRetrievalContext(
  evidence: FusedEvidence[],
  tokenBudget: number,
): { context: string; selectedEvidence: FusedEvidence[] } {
  const contextBlocks: string[] = [];
  const selectedEvidence: FusedEvidence[] = [];

  for (const item of evidence) {
    const block = evidenceToContextBlock(item);
    const nextContext = [...contextBlocks, block].join("\n\n");

    if (countTokens(nextContext) > tokenBudget) {
      break;
    }

    contextBlocks.push(block);
    selectedEvidence.push(item);
  }

  return {
    context: contextBlocks.join("\n\n"),
    selectedEvidence,
  };
}

function evidenceToContextBlock(item: FusedEvidence): string {
  const timestamp = item.startSeconds === null ? "n/a" : formatContextTimestamp(item.startSeconds);
  const label = item.kind === "insight" ? "Insight" : "Transcript";

  return [
    `Item: ${item.videoTitle} [${item.contentType}] (${item.externalId})`,
    `Type: ${label}`,
    `Timestamp: ${timestamp}`,
    `Score: ${item.fusedScore.toFixed(3)}`,
    `Content: ${item.text}`,
  ].join("\n");
}

function formatContextTimestamp(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  const hours = Math.floor(seconds / 3600);

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function mergeEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 0) {
    return [];
  }

  if (embeddings.length === 1) {
    return embeddings[0] ?? [];
  }

  const dimensions = embeddings[0]?.length ?? 0;
  if (dimensions === 0) {
    return [];
  }

  const merged = new Array<number>(dimensions).fill(0);

  for (const embedding of embeddings) {
    for (let i = 0; i < dimensions; i += 1) {
      merged[i] += embedding[i] ?? 0;
    }
  }

  for (let i = 0; i < dimensions; i += 1) {
    merged[i] /= embeddings.length;
  }

  return merged;
}

function truncateTitle(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= 60) {
    return trimmed;
  }

  return `${trimmed.slice(0, 57)}...`;
}

function countMessagesTokens(messages: ChatMessageListItem[]): number {
  return messages.reduce((total, message) => total + countTokens(message.content), 0);
}

function countTokens(text: string): number {
  return encoder.encode(text).length;
}

function mapFinishReasonToMessageStatus(finishReason: FinishReason): "completed" | "aborted" | "failed" {
  if (finishReason === "stop" || finishReason === "length") {
    return "completed";
  }

  if (finishReason === "error") {
    return "failed";
  }

  return "aborted";
}
