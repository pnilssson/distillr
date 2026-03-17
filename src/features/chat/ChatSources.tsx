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
          <li key={item.itemId} className="text-xs">
            <div className="flex items-baseline gap-2">
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
            </div>

            {item.anchors.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-1.5 pl-5">
                {item.anchors.map((anchor) => (
                  <a
                    key={`${item.itemId}-${anchor.anchorType}-${anchor.url}`}
                    href={anchor.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {anchor.label ?? anchor.anchorType}
                  </a>
                ))}
              </div>
            ) : null}
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
