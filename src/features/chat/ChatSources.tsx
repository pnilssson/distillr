"use client";

import { useMemo, useState } from "react";

import type { ChatMessageSources } from "@/features/chat/types";

const INITIAL_VISIBLE_ITEMS = 4;

type ChatSourcesProps = {
  sources: ChatMessageSources;
};

export function ChatSources({ sources }: ChatSourcesProps) {
  const [expanded, setExpanded] = useState(false);

  const sortedItems = useMemo(
    () =>
      [...sources.items].sort((a, b) => {
        if (b.referenceCount !== a.referenceCount) {
          return b.referenceCount - a.referenceCount;
        }

        return a.itemId.localeCompare(b.itemId);
      }),
    [sources.items],
  );

  if (sortedItems.length === 0) {
    return null;
  }

  const visibleItems = expanded ? sortedItems : sortedItems.slice(0, INITIAL_VISIBLE_ITEMS);

  return (
    <div className="mt-3 border-t pt-3" aria-label="Sources">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Sources</p>

      <ol className="space-y-1.5">
        {visibleItems.map((item, index) => (
          <li key={item.itemId} className="flex items-baseline gap-2 text-xs">
            <span className="shrink-0 text-muted-foreground">{index + 1}.</span>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate font-medium underline underline-offset-2"
              title={item.title}
            >
              {item.title}
            </a>
            <span className="shrink-0 text-muted-foreground">({item.referenceCount})</span>
          </li>
        ))}
      </ol>

      {sortedItems.length > INITIAL_VISIBLE_ITEMS ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {expanded
            ? "Show fewer sources"
            : `Show all ${sortedItems.length} sources`}
        </button>
      ) : null}
    </div>
  );
}
