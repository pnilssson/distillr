"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent, KeyboardEvent, RefObject } from "react";
import { ArrowUp, Settings, Square } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHAT_MODEL_OPTIONS } from "@/lib/chat-models";
import type { ChatModelId, ChatRequestMode } from "@/features/chat/types";

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  onRetry: () => void;
  mode: ChatRequestMode;
  onModeChange: (mode: ChatRequestMode) => void;
  model: ChatModelId;
  onModelChange: (model: ChatModelId) => void;
  status: "ready" | "submitted" | "streaming" | "error";
  error: Error | null;
  canUpgrade: boolean;
  upgradeLabel: string;
  onUpgrade: () => void;
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
  model,
  onModelChange,
  status,
  error,
  canUpgrade,
  upgradeLabel,
  onUpgrade,
  textareaRef,
}: ChatInputProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

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
  const errorMessage = getErrorMessage(error);

  return (
    <div>
      {error ? (
        <div
          id={inputErrorId}
          role="alert"
          className="mb-2 flex items-center justify-between rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <span>{errorMessage}</span>
          <div className="flex items-center gap-3">
            {canUpgrade ? (
              <button type="button" onClick={onUpgrade} className="font-medium underline">
                {upgradeLabel}
              </button>
            ) : null}
            <button type="button" onClick={onRetry} className="font-medium underline">
              Try again
            </button>
          </div>
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
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  disabled={canStop}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                  aria-label="Chat settings"
                >
                  <Settings size={16} />
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Chat settings</DialogTitle>
                  <DialogDescription>
                    Configure how Distillr responds.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-5 text-sm">
                  <div className="space-y-2">
                    <label htmlFor="settings-mode" className="font-medium">
                      Response mode
                    </label>
                    <p className="text-muted-foreground">
                      Controls whether Distillr searches your library when answering.
                    </p>
                    <Select
                      value={mode}
                      onValueChange={(value) => onModeChange(value as ChatRequestMode)}
                    >
                      <SelectTrigger id="settings-mode" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="library">Use library</SelectItem>
                        <SelectItem value="chat">Chat only</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <p><span className="font-medium text-foreground">Auto</span> - Chooses between library-grounded answers and chat-only replies based on your message.</p>
                      <p><span className="font-medium text-foreground">Use library</span> - Always searches ready videos in this library for grounded, source-linked answers.</p>
                      <p><span className="font-medium text-foreground">Chat only</span> - Skips retrieval and uses recent chat history only. Best for brainstorming and drafting.</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="settings-model" className="font-medium">
                      AI model
                    </label>
                    <p className="text-muted-foreground">
                      Choose between speed and capability. Smarter models use more credits.
                    </p>
                    <Select
                      value={model}
                      onValueChange={(value) => onModelChange(value as ChatModelId)}
                    >
                      <SelectTrigger id="settings-model" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CHAT_MODEL_OPTIONS.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <p><span className="font-medium text-foreground">Nano</span> - Fastest responses, lowest credit cost. Good for simple, quick questions.</p>
                      <p><span className="font-medium text-foreground">Mini</span> - Balanced speed and capability. Recommended for most questions.</p>
                      <p><span className="font-medium text-foreground">Smart</span> - Most capable model. Best for complex reasoning. Uses the most credits.</p>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

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
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:pointer-events-none disabled:opacity-50 ${
                canSend
                  ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-muted-foreground hover:bg-muted"
              }`}
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

function getErrorMessage(error: Error | null): string {
  if (!error?.message) {
    return "Something went wrong.";
  }

  try {
    const parsed = JSON.parse(error.message) as { error?: unknown };
    if (typeof parsed.error === "string" && parsed.error.length > 0) {
      return parsed.error;
    }
  } catch {
    // Ignore parse failures and fallback to raw message.
  }

  return error.message;
}
