"use client";

import { Copy } from "lucide-react";
import type { UIMessage } from "ai";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ChatSources } from "@/features/chat/ChatSources";
import type { ChatMessageMetadata } from "@/features/chat/types";
import { cn } from "@/lib/utils";

type ChatMessageProps = {
  message: UIMessage<ChatMessageMetadata>;
  isLastMessage: boolean;
  isStreaming: boolean;
  isAborted: boolean;
};

export function ChatMessage({ message, isLastMessage, isStreaming, isAborted }: ChatMessageProps) {
  const textContent = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
  const isPersistedAborted = message.metadata?.status === "aborted";

  if (message.role === "user") {
    return (
      <div className={cn("flex justify-end", isLastMessage && "mb-[13rem]")}>
        <div className="max-w-[80%] break-words rounded-2xl bg-muted px-4 py-2 text-sm">{textContent}</div>
      </div>
    );
  }

  async function handleCopy() {
    if (typeof navigator === "undefined") {
      return;
    }

    try {
      await navigator.clipboard.writeText(textContent);
    } catch {
      // Ignore clipboard errors.
    }
  }

  return (
    <div className={cn("group relative py-4", isLastMessage && "mb-[13rem]")}>
      {message.metadata?.effectiveMode ? (
        <p className="mb-2 text-xs text-muted-foreground">
          {message.metadata.effectiveMode === "library"
            ? "Used library evidence"
            : "Chat-only response"}
        </p>
      ) : null}

      <ReactMarkdown
        skipHtml
        remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
        disallowedElements={["img"]}
        components={markdownComponents}
      >
        {textContent}
      </ReactMarkdown>

      {isLastMessage && isStreaming ? (
        <span
          className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-foreground align-middle motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : null}

      {isAborted || isPersistedAborted ? (
        <p className="mt-1 text-xs italic text-muted-foreground">Response stopped.</p>
      ) : null}

      {message.metadata?.sources && message.metadata.sources.videos.length > 0 ? (
        <ChatSources sources={message.metadata.sources} />
      ) : null}

      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-4 right-0 rounded-md p-1 text-muted-foreground opacity-100 transition-opacity focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        aria-label="Copy message"
      >
        <Copy size={14} />
      </button>
    </div>
  );
}

const markdownComponents = {
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a
      href={href ?? "#"}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="underline underline-offset-2"
    >
      {children}
    </a>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="mt-4 mb-2 text-base font-semibold">{children}</h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="mt-3 mb-1 text-sm font-semibold">{children}</h3>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="my-2 ml-4 list-disc space-y-1 text-sm">{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="my-2 ml-4 list-decimal space-y-1 text-sm">{children}</ol>
  ),
  li: ({ children }: { children?: ReactNode }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  code: ({ children }: { children?: ReactNode }) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>
  ),
  pre: ({ children }: { children?: ReactNode }) => (
    <pre className="my-3 overflow-x-auto rounded-md bg-muted p-3 text-xs font-mono">{children}</pre>
  ),
  p: ({ children }: { children?: ReactNode }) => (
    <p className="my-1 text-sm leading-relaxed">{children}</p>
  ),
};
