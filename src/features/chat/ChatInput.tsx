"use client";

import { useEffect } from "react";
import type { ChangeEvent, KeyboardEvent, RefObject } from "react";
import { ArrowUp, Square } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChatRequestMode } from "@/features/chat/types";

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  onRetry: () => void;
  mode: ChatRequestMode;
  onModeChange: (mode: ChatRequestMode) => void;
  status: "ready" | "submitted" | "streaming" | "error";
  error: Error | null;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
};

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  onRetry,
  mode,
  onModeChange,
  status,
  error,
  textareaRef,
}: ChatInputProps) {
  useEffect(() => {
    if (!value && textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, textareaRef]);

  function handleInput(event: ChangeEvent<HTMLTextAreaElement>) {
    event.target.style.height = "auto";
    event.target.style.height = `${Math.min(event.target.scrollHeight, 192)}px`;
    onChange(event.target.value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
      return;
    }

    if (event.key === "Escape" && (status === "submitted" || status === "streaming")) {
      event.preventDefault();
      onStop();
    }
  }

  const canSend = status === "ready" && value.trim().length > 0;
  const canStop = status === "submitted" || status === "streaming";
  const inputErrorId = "chat-input-error";

  return (
    <div>
      {error ? (
        <div
          id={inputErrorId}
          role="alert"
          className="mb-2 flex items-center justify-between rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <span>Something went wrong.</span>
          <button type="button" onClick={onRetry} className="font-medium underline">
            Try again
          </button>
        </div>
      ) : null}

      <div className="rounded-xl border bg-background px-3 pt-3 pb-2 focus-within:ring-2 focus-within:ring-ring">
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <textarea
          id="chat-input"
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your library…"
          name="message"
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? inputErrorId : undefined}
          rows={1}
          maxLength={4000}
          className="max-h-48 w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Select
              value={mode}
              onValueChange={(value) => onModeChange(value as ChatRequestMode)}
              disabled={canStop}
            >
              <SelectTrigger className="h-8 w-32 text-xs text-muted-foreground" aria-label="Response mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="library">Use library</SelectItem>
                <SelectItem value="chat">Chat only</SelectItem>
              </SelectContent>
            </Select>

            {value.length > 3500 ? (
              <span className="text-xs text-destructive">{4000 - value.length} remaining</span>
            ) : null}
          </div>

          {canStop ? (
            <button
              type="button"
              onClick={onStop}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Stop generating"
            >
              <Square size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSend}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
              aria-label="Send message"
            >
              <ArrowUp size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
