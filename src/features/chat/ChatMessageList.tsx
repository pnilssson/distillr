"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";

import { ChatMessage } from "@/features/chat/ChatMessage";
import { EmptyChatState } from "@/features/chat/EmptyChatState";
import type { ChatMessageMetadata } from "@/features/chat/types";

type ChatMessageListProps = {
  messages: UIMessage<ChatMessageMetadata>[];
  status: "ready" | "submitted" | "streaming" | "error";
  abortedMessageId: string | null;
  onSuggestion: (text: string) => void;
};

export function ChatMessageList({
  messages,
  status,
  abortedMessageId,
  onSuggestion,
}: ChatMessageListProps) {
  const containerRef = useRef<HTMLElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const lastMessageParts = messages[messages.length - 1]?.parts;
  const isEmptyState = messages.length === 0 && status === "ready";

  useEffect(() => {
    if (status === "submitted") {
      isAtBottomRef.current = true;
    }
  }, [status]);

  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [lastMessageParts]);

  function handleScroll() {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    isAtBottomRef.current =
      element.scrollTop + element.clientHeight >= element.scrollHeight - 32;
  }

  return (
    <section
      ref={containerRef}
      className="min-h-0 flex flex-1 flex-col overflow-y-auto"
      style={{ scrollPaddingBottom: "13rem" }}
      aria-label="Messages"
      aria-live="polite"
      aria-atomic="false"
      onScroll={handleScroll}
    >
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-1 flex-col px-4 pt-6 pb-8">
        {isEmptyState ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyChatState onSuggestion={onSuggestion} />
          </div>
        ) : null}

        <div className="space-y-4">
          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              isLastMessage={index === messages.length - 1}
              isStreaming={status === "streaming"}
              isAborted={message.id === abortedMessageId}
            />
          ))}

          {status === "submitted" ? (
            <div role="status" aria-label="Generating response" className="mb-[13rem] flex gap-1 py-4">
              {[0, 1, 2].map((index) => (
                <span
                  key={index}
                  className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground motion-reduce:animate-none"
                  style={{ animationDelay: `${index * 150}ms` }}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div ref={bottomRef} aria-hidden="true" className="scroll-mb-[13rem]" />
      </div>
    </section>
  );
}
