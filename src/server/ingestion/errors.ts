import "server-only";

import { NonRetriableError } from "inngest";

import { isTranscriptUnavailableMessage } from "@/server/core/errors/user-facing";
import { TranscriptUnavailableError } from "@/server/ingestion/transcript";
import { YouTubeDiscoveryError } from "@/server/ingestion/youtube-discovery";

export type IngestionErrorDecision = {
  reason: string;
  retryable: boolean;
  captureException: boolean;
};

export function classifyIngestionError(error: unknown): IngestionErrorDecision {
  if (hasTranscriptUnavailableSignal(error)) {
    return {
      reason: "No transcript is available for this video.",
      retryable: false,
      captureException: false,
    };
  }

  if (error instanceof NonRetriableError) {
    return {
      reason: normalizeFailureReason(error.message),
      retryable: false,
      captureException: false,
    };
  }

  if (error instanceof TranscriptUnavailableError) {
    return {
      reason: normalizeFailureReason(error.message),
      retryable: !error.terminal,
      captureException: !error.terminal,
    };
  }

  if (error instanceof YouTubeDiscoveryError) {
    return {
      reason: normalizeFailureReason(error.message),
      retryable: !error.terminal,
      captureException: !error.terminal,
    };
  }

  if (error instanceof Error) {
    return {
      reason: normalizeFailureReason(error.message),
      retryable: true,
      captureException: true,
    };
  }

  return {
    reason: "Processing failed due to an unknown error.",
    retryable: true,
    captureException: true,
  };
}

function normalizeFailureReason(reason: string): string {
  if (isTranscriptUnavailableMessage(reason)) {
    return "No transcript is available for this video.";
  }

  const message = reason.trim();

  if (message.length === 0) {
    return "Processing failed due to an unknown error.";
  }

  return message;
}

function hasTranscriptUnavailableSignal(error: unknown): boolean {
  const messages = collectErrorMessages(error);
  return messages.some((message) => isTranscriptUnavailableMessage(message));
}

function collectErrorMessages(error: unknown): string[] {
  const messages: string[] = [];
  const queue: unknown[] = [error];
  const seen = new Set<unknown>();

  while (queue.length > 0 && messages.length < 24) {
    const current = queue.shift();

    if (!current || seen.has(current)) {
      continue;
    }

    seen.add(current);

    if (current instanceof Error) {
      if (current.message) {
        messages.push(current.message);
      }

      if (current.name) {
        messages.push(current.name);
      }

      const combined = `${current.name}: ${current.message}`.trim();
      if (combined) {
        messages.push(combined);
      }

      const withCause = current as Error & { cause?: unknown };
      if (withCause.cause) {
        queue.push(withCause.cause);
      }
      continue;
    }

    if (typeof current === "string") {
      messages.push(current);
      continue;
    }

    if (typeof current === "object") {
      const value = current as Record<string, unknown>;

      if (typeof value.message === "string") {
        messages.push(value.message);
      }

      if (typeof value.detail === "string") {
        messages.push(value.detail);
      }

      if (typeof value.reason === "string") {
        messages.push(value.reason);
      }

      if (value.cause) {
        queue.push(value.cause);
      }

      if (value.error) {
        queue.push(value.error);
      }
    }
  }

  return messages;
}
