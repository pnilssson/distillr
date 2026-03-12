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
    if (isTranscriptUnavailableMessage(error.message)) {
      return {
        reason: "No transcript is available for this video.",
        retryable: false,
        captureException: false,
      };
    }

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
