"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { type UIMessage, DefaultChatTransport } from "ai";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createCheckoutSession,
  fetchBillingState,
} from "@/features/billing/api";
import { useBillingState } from "@/features/billing/useBillingState";
import { ChatInput } from "@/features/chat/ChatInput";
import { ChatMessageList } from "@/features/chat/ChatMessageList";
import { DEFAULT_CHAT_MODEL_ID } from "@/lib/chat-models";
import type {
  ChatMessageMetadata,
  ChatModelId,
  ChatRequestMode,
} from "@/features/chat/types";

type ChatViewProps = {
  libraryId: string;
  sessionId: string;
  messages: UIMessage<ChatMessageMetadata>[];
};

export function ChatView({
  libraryId,
  sessionId,
  messages: initialMessages,
}: ChatViewProps) {
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const billingQuery = useBillingState();

  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatRequestMode>("auto");
  const [model, setModel] = useState<ChatModelId>(DEFAULT_CHAT_MODEL_ID);
  const [abortedMessageId, setAbortedMessageId] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);

  const checkoutTarget = billingQuery.data?.hasTopUpAccess ? "top_up_tier_1" : "builder";
  const upgradeLabel = checkoutTarget === "top_up_tier_1" ? "Top up" : "Upgrade";

  const { messages, sendMessage, stop, regenerate, status, error, clearError } =
    useChat<UIMessage<ChatMessageMetadata>>({
      id: sessionId,
      messages: initialMessages,
      transport: new DefaultChatTransport({
        api: `/api/libraries/${libraryId}/chat/sessions/${sessionId}/messages`,
        prepareSendMessagesRequest: ({
          messages: requestMessages,
          body,
          trigger,
        }) => {
          const latestMessage = requestMessages[requestMessages.length - 1];
          const latestUserMessage = [...requestMessages]
            .reverse()
            .find((message) => message.role === "user");
          const messageForContent =
            trigger === "regenerate-message"
              ? (latestUserMessage ?? latestMessage)
              : latestMessage;

          return {
            body: {
              content: extractTextContent(messageForContent),
              mode: typeof body?.mode === "string" ? body.mode : "auto",
              model: typeof body?.model === "string" ? body.model : DEFAULT_CHAT_MODEL_ID,
            },
          };
        },
      }),
      onFinish: ({ message, isAbort }) => {
        if (isAbort) {
          setAbortedMessageId(message.id);
        }

        queryClient.invalidateQueries({
          queryKey: ["chat-sessions", libraryId],
        });
      },
    });

  useEffect(() => {
    textareaRef.current?.focus();
  }, [focusTick]);

  function handleSubmit() {
    if (!input.trim() || status !== "ready") {
      return;
    }

    setAbortedMessageId(null);
    sendMessage({ text: input }, { body: { mode, model } });
    setInput("");
    setFocusTick((tick) => tick + 1);
  }

  function handleSuggestion(text: string) {
    setInput(text);
    if (error) {
      clearError();
    }

    setFocusTick((tick) => tick + 1);
  }

  async function handleUpgrade() {
    try {
      const billingState = await queryClient.ensureQueryData({
        queryKey: ["billing", "state"],
        queryFn: fetchBillingState,
      });
      const target = billingState.hasTopUpAccess ? "top_up_tier_1" : "builder";

      const url = await createCheckoutSession(
        target,
        `/library/${libraryId}/chat/${sessionId}`,
        "chat",
      );
      window.location.assign(url);
    } catch (upgradeError) {
      toast.error(
        upgradeError instanceof Error
          ? upgradeError.message
          : "Could not start checkout right now.",
      );
    }
  }

  const canUpgrade = isInsufficientCreditsError(error);

  return (
    <main
      className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden"
      aria-label="Chat"
    >
      <ChatMessageList
        messages={messages}
        status={status}
        abortedMessageId={abortedMessageId}
        onSuggestion={handleSuggestion}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col">
        <div
          className="h-12 bg-linear-to-t from-background to-transparent"
          aria-hidden="true"
        />
        <div className="pointer-events-auto bg-background px-4 pb-4">
          <div className="mx-auto w-full max-w-2xl">
            <ChatInput
              value={input}
              onChange={(value) => {
                setInput(value);
                if (error) {
                  clearError();
                }
              }}
              onSubmit={handleSubmit}
              onStop={() => {
                void stop();
              }}
              onRetry={() => {
                void regenerate({ body: { mode, model } });
              }}
              mode={mode}
              onModeChange={setMode}
              model={model}
              onModelChange={setModel}
              status={status}
              error={error ?? null}
              canUpgrade={canUpgrade}
              upgradeLabel={upgradeLabel}
              onUpgrade={() => {
                void handleUpgrade();
              }}
              textareaRef={textareaRef}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function extractTextContent(
  message: UIMessage<ChatMessageMetadata> | undefined,
): string {
  if (!message) {
    return "";
  }

  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function isInsufficientCreditsError(error: Error | undefined | null): boolean {
  if (!error?.message) {
    return false;
  }

  return error.message.toLowerCase().includes("enough credits");
}
