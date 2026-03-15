# Chat UI Implementation Plan

This document covers the full frontend implementation for library chat in Distillr.

Backend must be complete (see `docs/chat-implementation-plan.md`) before starting UI work. The API contracts in that plan are the source of truth for all fetch calls here.

## Non-negotiable constraints

- Follow `AGENTS.md` invariants (accessibility, no direct `src/components/ui/` edits, semantic HTML).
- `'use client'` only where interactivity, state, lifecycle hooks, or browser APIs are required.
- All data mutations go through server route handlers - no direct DB calls from client code.
- Vercel AI SDK v6 APIs throughout. Do not use v4 patterns (see breaking changes section below).
- Markdown rendering must use current APIs from `react-markdown@^10` and `remark-gfm@^4`.
- Keep markdown rendering safe by default: do not add `rehype-raw` and do not override `urlTransform` with unsafe behavior.

---

## Markdown packages - current versions and guardrails

Researched current package lines before implementation:

- `react-markdown`: latest `10.1.0` (ESM-only, Node 16+).
- `remark-gfm`: latest `4.0.1` (ESM-only, Node 16+).
- `react-markdown` peer dependency: `react >= 18` (compatible with this project on React 19).

Implementation guardrails for this project:

- Use only `remark-gfm` as the markdown plugin for chat messages.
- Keep `react-markdown` in safe mode (`skipHtml`, no `rehype-raw`).
- Do not override `urlTransform` unless there is a concrete security-reviewed need.

---

## AI SDK v6 - Breaking changes that affect this plan

The AI SDK shipped major v5 and v6 releases. These are the v4 patterns the Doer must NOT use:

| v4 (wrong) | v6 (correct) |
|------------|--------------|
| `useChat({ initialMessages })` | `useChat({ messages })` |
| `const { reload } = useChat()` | `const { regenerate } = useChat()` |
| `const { isLoading } = useChat()` | `const { status } = useChat()` |
| `const { input, handleInputChange, handleSubmit } = useChat()` | Manage `input` with `useState` manually |
| `append({ role: 'user', content: '...' })` | `sendMessage({ text: '...' })` |
| `import { useChat } from 'ai/react'` | `import { useChat } from '@ai-sdk/react'` |
| `import { convertToCoreMessages } from 'ai'` | `import { convertToModelMessages } from 'ai'` |
| Token: `promptTokens` / `completionTokens` | Token: `inputTokens` / `outputTokens` |
| `useChat({ api: '/api/chat', ... })` | `useChat({ transport: new DefaultChatTransport({ api: ... }) })` |
| `experimental_prepareRequestBody` | `prepareSendMessagesRequest` in transport config |
| `onFinish(message, { usage })` | `onFinish({ message, messages, isAbort, isDisconnect, isError, finishReason })` |

Key v6 additions used in this plan:
- `clearError()` from `useChat` - clears the error state
- `status: 'submitted' | 'streaming' | 'ready' | 'error'` - replaces `isLoading`
- `DefaultChatTransport` from `'ai'` - transport configuration object
- `message.parts` array (not `message.content`) - the message body is always `parts`

---

## Architecture overview

```
Routing:
  /library/[libraryId]                       ← library overview (updated to surface chat CTA)
  /library/[libraryId]/chat/[sessionId]      ← chat session page (new)

Data flow:
  page.tsx (server component)
    └─ requireUserOrRedirect()
    └─ getLibraryById(userId, libraryId)     → notFound() if missing
    └─ getChatSessionById(...)               → notFound() if missing
    └─ listChatMessages(...)                 → DB messages
    └─ toUIMessages(dbMessages)              → UIMessage[]
    └─ <ChatView messages={uiMessages} ... />

  ChatView ('use client')
    └─ useChat({ id: sessionId, messages, transport })
         transport = DefaultChatTransport({
           api: /api/libraries/.../messages,
           prepareSendMessagesRequest: send only { content }
         })
    └─ onFinish: invalidate ['chat-sessions', libraryId]
    └─ <ChatMessageList> + <ChatInput>

  AppSidebar (updated)
    └─ <ChatSidebarSection libraryId={activeLibraryId} />
         └─ useChatSessions(libraryId)
         └─ session list + "New chat" button
```

---

## Phase 14 - Install packages

This phase must run before any backend (Phase 9) or frontend code is written. The AI SDK packages are not yet in `package.json`.

### Tasks

1. Install:
   ```
   npm install ai @ai-sdk/react @ai-sdk/openai react-markdown@^10 remark-gfm@^4
   ```
2. Verify all five packages appear in `package.json` dependencies.
3. Update `AGENTS.md` locked stack choices to add:
   - `ai` + `@ai-sdk/react` (Vercel AI SDK v6 - streaming transport and hooks)
   - `@ai-sdk/openai` (OpenAI provider for `streamText`)

### Completion check

- `npm run typecheck` passes with `import { useChat } from '@ai-sdk/react'` resolvable.
- `AGENTS.md` locked stack includes the AI SDK packages.
- `react-markdown` resolves to major `10` and `remark-gfm` resolves to major `4`.

---

## Phase 15 - Chat feature types and API client

### Add

- `src/features/chat/types.ts`
- `src/features/chat/api.ts`

### `types.ts`

```ts
export type ChatSessionListItem = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  messageCount: number;
};

export type ChatMessageSource = {
  videoId: string;
  youtubeVideoId: string;
  title: string;
  timestamps: { seconds: number; label: string; url: string }[];
};

export type ChatMessageSources = {
  videos: ChatMessageSource[];
  extraVideos: number;
};

export type ChatMessageItem = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  model: string | null;
  status: 'completed' | 'aborted' | 'failed';
  usage: { inputTokens: number; outputTokens: number; totalTokens: number } | null;
  sources: ChatMessageSources | null;
};

// Type for message metadata passed via useChat (from stream + initialMessages)
export type ChatMessageMetadata = {
  sources?: ChatMessageSources;
};
```

### `api.ts`

Follow the exact pattern in `src/features/libraries/api.ts`: fetch, `parseJsonResponse`, `getApiErrorMessage`.

Implement:
- `fetchChatSessions(libraryId: string): Promise<ChatSessionListItem[]>`
- `createChatSession(libraryId: string): Promise<ChatSessionListItem>`
- `fetchChatMessages(libraryId: string, sessionId: string): Promise<ChatMessageItem[]>`

All error messages are provider-agnostic fallbacks ("Could not load chats. Please try again.").

### Completion check

- All functions typed against Phase 10 response contracts.
- Error handling follows `getApiErrorMessage` pattern.

---

## Phase 16 - TanStack Query hooks

### Add

- `src/features/chat/useChatSessions.ts`
- `src/features/chat/useCreateChatSession.ts`

### `useChatSessions.ts`

```ts
import { useQuery } from '@tanstack/react-query';
import { fetchChatSessions } from './api';

export function useChatSessions(libraryId: string | null) {
  return useQuery({
    queryKey: ['chat-sessions', libraryId],
    queryFn: () => fetchChatSessions(libraryId!),
    enabled: Boolean(libraryId),
  });
}
```

### `useCreateChatSession.ts`

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createChatSession } from './api';

export function useCreateChatSession(libraryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => createChatSession(libraryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions', libraryId] });
    },
  });
}
```

### Completion check

- Shape matches `useLibraries` and `useSources` patterns exactly.

---

## Phase 17 - Chat sidebar section

### Add

- `src/features/chat/ChatSidebarSection.tsx`

### Responsibilities

- Same section group pattern as `VideoSidebarSection` - a `<section>` with `<h3>` label inside the active library `SidebarGroup`.
- `SidebarGroupAction` "+ New chat" button: calls `useCreateChatSession`, navigates to the new session URL on mutation success (`router.push(\`/library/${libraryId}/chat/${session.id}\`)`).
- `useChatSessions` to list sessions sorted by `lastMessageAt` desc (sort client-side if not already sorted by API).
- Each session: `SidebarMenuButton` navigating to `/library/[libraryId]/chat/[sessionId]`, `isActive={pathname === ...}`.
- Each session has an overflow menu with a destructive "Delete chat" action and confirmation dialog.
- Session title: single line, `truncate`.
- Loading: 3 skeleton placeholders (`<Skeleton className="h-6 w-full" />`).
- Empty: `<p className="px-2 py-1 text-xs text-muted-foreground">No chats yet</p>`.
- Error: `<p className="px-2 py-1 text-xs text-destructive">Could not load chats.</p>`.

### Update `AppSidebar.tsx`

- Import `ChatSidebarSection`.
- Render `<ChatSidebarSection libraryId={activeLibraryId} />` above sources and videos inside the active library area.
- Close the mobile sidebar sheet when the Home nav item is clicked.
- Close the mobile sidebar sheet when a chat session is selected.

### Completion check

- Chat section visible when a library is active.
- Creating a session from "+ New chat" navigates correctly.
- Active session highlighted. Inactive sessions do not show as active.

---

## Phase 18 - Route pages

### Add

- `src/app/(app)/library/[libraryId]/chat/[sessionId]/page.tsx`
- `src/app/(app)/library/[libraryId]/chat/[sessionId]/loading.tsx`

### `page.tsx` (server component - keep thin)

```tsx
import { notFound } from 'next/navigation';
import { requireUserOrRedirect } from '@/server/core/auth/user';
import { getLibraryById } from '@/server/libraries/queries';
import { getChatSessionById, listChatMessages } from '@/server/chat/queries';
import { ChatView } from '@/features/chat/ChatView';

type Props = { params: Promise<{ libraryId: string; sessionId: string }> };

export default async function ChatSessionPage({ params }: Props) {
  const { libraryId, sessionId } = await params;
  const user = await requireUserOrRedirect();

  const library = await getLibraryById(user.id, libraryId);
  if (!library) notFound();

  const session = await getChatSessionById(user.id, libraryId, sessionId);
  if (!session) notFound();

  const { messages: dbMessages } = await listChatMessages(user.id, libraryId, sessionId, {
    limit: 50,
  });

  const uiMessages = toUIMessages(dbMessages);

  return (
    <ChatView
      libraryId={libraryId}
      sessionId={sessionId}
      messages={uiMessages}
    />
  );
}
```

`toUIMessages` is a pure utility function in `src/features/chat/transform.ts`:

```ts
import type { UIMessage } from 'ai';
import type { ChatMessageItem, ChatMessageMetadata } from '@/features/chat/types';

export function toUIMessages(dbMessages: ChatMessageItem[]): UIMessage<ChatMessageMetadata>[] {
  return dbMessages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    parts: [{ type: 'text' as const, text: msg.content }],
    metadata: msg.sources ? { sources: msg.sources } : undefined,
  }));
}
```

### `loading.tsx`

```tsx
import { CenteredSpinner } from '@/components/CenteredSpinner';

export default function Loading() {
  return <CenteredSpinner label="Loading chat" className="h-full" />;
}
```

### Update `src/app/(app)/library/[libraryId]/page.tsx`

The library root page currently renders `EmptyLibraryState` which returns `null` once videos exist - leaving a blank screen for libraries with ready videos. Add `LibraryChatGateway` directly below to fill that state:

```tsx
import { EmptyLibraryState } from '@/features/sources/EmptyLibraryState';
import { LibraryChatGateway } from '@/features/libraries/LibraryChatGateway';

export default async function LibraryPage({ params }: LibraryPageProps) {
  // ... existing auth + notFound check
  return (
    <main className="flex h-full flex-1 flex-col">
      <div className="flex flex-1 items-center justify-center">
        <EmptyLibraryState libraryId={libraryId} />
        <LibraryChatGateway libraryId={libraryId} />
      </div>
    </main>
  );
}
```

`LibraryChatGateway` is responsible for showing itself only when `EmptyLibraryState` returns null (see Phase 21).

### Completion check

- `/library/[libraryId]/chat/[invalid-session-id]` returns 404.
- Loading skeleton shows on page transitions.
- Library root page shows the CTA when videos are ready.

---

## Phase 19 - Core chat components

### Add

- `src/features/chat/ChatView.tsx`
- `src/features/chat/ChatMessageList.tsx`
- `src/features/chat/ChatMessage.tsx`
- `src/features/chat/ChatInput.tsx`
- `src/features/chat/transform.ts` (toUIMessages, used by page.tsx)

### `ChatView.tsx` (`'use client'`)

Primary orchestrator. Owns `useChat` and wires all sub-components.

```tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { UIMessage } from 'ai';
import type { ChatMessageMetadata } from './types';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';

type ChatViewProps = {
  libraryId: string;
  sessionId: string;
  messages: UIMessage<ChatMessageMetadata>[];
};

export function ChatView({ libraryId, sessionId, messages: initialMessages }: ChatViewProps) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [abortedMessageId, setAbortedMessageId] = useState<string | null>(null);

  const { messages, sendMessage, stop, regenerate, status, error, clearError } =
    useChat<ChatMessageMetadata>({
      id: sessionId,
      messages: initialMessages,
      transport: new DefaultChatTransport({
        api: `/api/libraries/${libraryId}/chat/sessions/${sessionId}/messages`,
        prepareSendMessagesRequest: ({ messages: msgs }) => ({
          body: {
            content:
              msgs[msgs.length - 1]?.parts
                .filter((p) => p.type === 'text')
                .map((p) => (p as { type: 'text'; text: string }).text)
                .join('') ?? '',
          },
        }),
      }),
      onFinish: ({ message, isAbort }) => {
        if (isAbort) setAbortedMessageId(message.id);
        queryClient.invalidateQueries({ queryKey: ['chat-sessions', libraryId] });
      },
    });

  function handleSubmit() {
    if (!input.trim() || status !== 'ready') return;
    sendMessage({ text: input });
    setInput('');
  }

  return (
    <main className="flex h-full flex-col" aria-label="Chat">
      <ChatMessageList
        messages={messages}
        status={status}
        abortedMessageId={abortedMessageId}
      />
      <ChatInput
        value={input}
        onChange={(v) => { setInput(v); if (error) clearError(); }}
        onSubmit={handleSubmit}
        onStop={stop}
        onRetry={regenerate}
        status={status}
        error={error ?? null}
      />
    </main>
  );
}
```

### `ChatMessageList.tsx` (`'use client'`)

Responsibilities:
- Scrollable container (`overflow-y-auto flex-1`) with constrained thread width (`mx-auto max-w-2xl w-full px-4 py-6`).
- Auto-scroll to bottom on new messages and streaming, but only if user was already at bottom.
- "At bottom" tracking: set `true` on send; `onScroll` checks if `scrollTop + clientHeight >= scrollHeight - 32`.
- Show `EmptyChatState` when `messages.length === 0` and `status === 'ready'`.
- Show thinking indicator when `status === 'submitted'`.
- `aria-live="polite"` on the messages container.

Auto-scroll pattern:
```ts
const bottomRef = useRef<HTMLDivElement>(null);
const isAtBottomRef = useRef(true);

useEffect(() => {
  if (isAtBottomRef.current) {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }
}, [messages.length, messages[messages.length - 1]?.parts]);
```

Thinking indicator (shown when `status === 'submitted'`):
```tsx
<div role="status" aria-label="Generating response" className="flex gap-1 py-4">
  {[0, 1, 2].map((i) => (
    <span
      key={i}
      className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse"
      style={{ animationDelay: `${i * 150}ms` }}
    />
  ))}
</div>
```

### `ChatMessage.tsx`

Accepts a `UIMessage<ChatMessageMetadata>` + `isAborted: boolean` flag. Renders based on `role`.

**User messages:**
```tsx
<div className="flex justify-end">
  <div className="bg-muted rounded-2xl px-4 py-2 max-w-[80%] text-sm">
    {textContent}
  </div>
</div>
```

**Assistant messages:**
```tsx
<div className="group relative py-4">
  {/* Markdown body */}
  <ReactMarkdown
    skipHtml
    remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
    disallowedElements={['img']}
    components={markdownComponents}  // styled with Tailwind classes
  >
    {textContent}
  </ReactMarkdown>

  {/* Streaming cursor - only on last message while streaming */}
  {isStreaming && (
    <span className="animate-pulse ml-0.5 inline-block h-4 w-0.5 bg-foreground align-middle" aria-hidden="true" />
  )}

  {/* Aborted note */}
  {isAborted && (
    <p className="mt-1 text-xs text-muted-foreground italic">Response stopped.</p>
  )}

  {/* Sources rollup */}
  {message.metadata?.sources && message.metadata.sources.videos.length > 0 && (
    <ChatSources sources={message.metadata.sources} />
  )}

  {/* Copy button - visible on hover */}
  <button
    onClick={() => navigator.clipboard.writeText(textContent)}
    className="absolute top-4 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
    aria-label="Copy message"
  >
    <Copy size={14} />
  </button>
</div>
```

Markdown `components` prop - style without `@tailwindcss/typography`:
```ts
const markdownComponents = {
  a: ({ href, children }) => (
    <a
      href={href ?? '#'}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="underline underline-offset-2"
    >
      {children}
    </a>
  ),
  h2: ({ children }) => <h2 className="mt-4 mb-2 text-base font-semibold">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-3 mb-1 text-sm font-semibold">{children}</h3>,
  ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1 text-sm">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-1 text-sm">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>,
  pre: ({ children }) => <pre className="my-3 overflow-x-auto rounded-md bg-muted p-3 text-xs font-mono">{children}</pre>,
  p: ({ children }) => <p className="my-1 text-sm leading-relaxed">{children}</p>,
};
```

Note: extract text content from `message.parts`:
```ts
const textContent = message.parts
  .filter((p) => p.type === 'text')
  .map((p) => (p as { type: 'text'; text: string }).text)
  .join('');
```

### `ChatInput.tsx` (`'use client'`)

```tsx
type ChatInputProps = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  onRetry: () => void;
  status: 'ready' | 'submitted' | 'streaming' | 'error';
  error: Error | null;
};
```

Key implementation details:

- Auto-resize textarea with `useRef` + `onInput` handler:
  ```ts
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 192)}px`; // 192 = max-h-48
    onChange(e.target.value);
  }
  ```
- Reset height when value cleared: `useEffect(() => { if (!value) ref.current.style.height = 'auto'; }, [value])`.
- `onKeyDown`: `Enter` without shift → `e.preventDefault(); onSubmit()`. `Escape` → `onStop()` if streaming.
- Send button (status `'ready'`, value non-empty): `<ArrowUp size={16} />`, `aria-label="Send message"`.
- Stop button (status `'submitted'` or `'streaming'`): `<Square size={16} />`, `aria-label="Stop generating"`.
- Character count warning: render `<span className="text-xs text-destructive">{4000 - value.length} remaining</span>` when `value.length > 3500`.
- Error bar above the input when `error` is non-null:
  ```tsx
  {error && (
    <div role="alert" className="mb-2 flex items-center justify-between rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <span>Something went wrong.</span>
      <button onClick={onRetry} className="font-medium underline">Try again</button>
    </div>
  )}
  ```
- Container: `border rounded-xl bg-background px-3 pt-3 pb-2 shadow-sm focus-within:ring-2 focus-within:ring-ring`.
- `<label htmlFor="chat-input" className="sr-only">Message</label>` always rendered.

### Completion check

- Type, send, receive streamed response end-to-end.
- Auto-scroll works: stays at bottom during streaming, does not force-scroll if user scrolled up.
- Thinking indicator (3 dots, staggered) shows between send and first token.
- Stop button aborts the stream.
- Copy button copies assistant text.
- Error bar shows with retry; disappears on `clearError`.
- Raw HTML in model output is not rendered.

---

## Phase 20 - Sources rollup component

### Add

- `src/features/chat/ChatSources.tsx`

### Design spec

```
Sources
1. Retention Tactics for YouTube    02:10  14:22  31:05
2. Growing Your Channel Fast        05:44
3. Algorithm Secrets 2024           11:08
   +2 more videos used
```

Full implementation spec:

```tsx
import type { ChatMessageSources } from './types';

export function ChatSources({ sources }: { sources: ChatMessageSources }) {
  if (sources.videos.length === 0) return null;

  return (
    <div className="mt-3 border-t pt-3" aria-label="Sources">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Sources</p>
      <ol className="space-y-1.5">
        {sources.videos.map((video, i) => (
          <li key={video.videoId} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
            <span className="shrink-0 text-muted-foreground">{i + 1}.</span>
            <span className="max-w-[200px] truncate font-medium" title={video.title}>
              {video.title}
            </span>
            <span className="flex flex-wrap gap-1">
              {video.timestamps.map((ts) => (
                <a
                  key={ts.seconds}
                  href={ts.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded bg-muted px-1.5 py-0.5 text-xs hover:bg-muted/70 transition-colors"
                  aria-label={`Jump to ${ts.label} in ${video.title}`}
                >
                  {ts.label}
                </a>
              ))}
            </span>
          </li>
        ))}
      </ol>
      {sources.extraVideos > 0 && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          +{sources.extraVideos} more {sources.extraVideos === 1 ? 'video' : 'videos'} used
        </p>
      )}
    </div>
  );
}
```

### Completion check

- Sources render below assistant messages that have metadata sources.
- Timestamp links open `https://youtube.com/watch?v=ID&t=SECONDS` in a new tab.
- Not rendered when `sources.videos.length === 0`.
- Accessible: `aria-label` on container and each timestamp link.

---

## Phase 21 - Empty states and library gateway

### Add

- `src/features/chat/EmptyChatState.tsx`
- `src/features/libraries/LibraryChatGateway.tsx`

### `EmptyChatState.tsx`

Shown inside `ChatMessageList` when `messages.length === 0` and `status === 'ready'`.

```tsx
const SUGGESTIONS = [
  'What are the main themes across these videos?',
  'What tools or tactics are mentioned most?',
  'What questions does this content answer?',
  'Summarize the key points in this library.',
];

export function EmptyChatState({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="text-base font-semibold">Ask anything about this library</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Questions are answered across all ready videos.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSuggestion(s)}
            className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
```

Pass `onSuggestion` down from `ChatView` (populates input via `setInput`).

Update `ChatMessageList` to accept and forward `onSuggestion` prop.

### `LibraryChatGateway.tsx` (`'use client'`)

Shows only when `EmptyLibraryState` returns `null` (library has ready videos). Owns the "Start chatting" flow from the library root page.

Logic:
- `useLibraryVideos(libraryId)`: if `!data || data.counts.ready === 0 || !data.isSettled` → return `null`.
- `useChatSessions(libraryId)`: to offer "Continue last chat" if sessions exist.
- `useCreateChatSession(libraryId)` + `useRouter` for navigation.

Layout:
```tsx
<div className="px-6 py-24 text-center max-w-sm mx-auto">
  <h1 className="text-lg font-semibold">Your library is ready</h1>
  <p className="mt-2 text-sm text-muted-foreground">
    Ask questions across all {data.counts.ready} ready {data.counts.ready === 1 ? 'video' : 'videos'}.
  </p>
  <div className="mt-8 flex flex-wrap justify-center gap-3">
    <Button onClick={handleNewChat} disabled={mutation.isPending}>
      {mutation.isPending ? 'Creating...' : 'New chat'}
    </Button>
    {mostRecentSession && (
      <Button variant="outline" onClick={() => router.push(...)}>
        Continue last chat
      </Button>
    )}
  </div>
</div>
```

### Completion check

- New session: `EmptyChatState` shows with suggestion chips that populate the input.
- Library root: gateway shows only when videos are ready and `EmptyLibraryState` returns null (no overlap).
- "New chat" creates and navigates. "Continue last chat" navigates to most recent session.

---

## Phase 22 - Streaming UX polish

### Thinking indicator

Already specified in `ChatMessageList` (Phase 19): three dots with staggered `animation-delay` shown when `status === 'submitted'`.

The dots must disappear the moment `status` changes to `'streaming'` - React state drives this automatically since `status` is from `useChat`.

### Streaming cursor

Rendered in `ChatMessage` at end of last message text while `status === 'streaming'`:
```tsx
{isLastMessage && status === 'streaming' && (
  <span
    className="animate-pulse ml-0.5 inline-block h-4 w-0.5 bg-foreground align-middle"
    aria-hidden="true"
  />
)}
```

Pass `isLastMessage` as a prop from `ChatMessageList` (check `index === messages.length - 1`).

### Abort feedback

In `ChatView`, track `abortedMessageId` state. Set it in `onFinish({ isAbort, message })` when `isAbort` is true. Pass down to `ChatMessage` as `isAborted={message.id === abortedMessageId}`.

### Session title refresh

`onFinish` in `ChatView` calls:
```ts
queryClient.invalidateQueries({ queryKey: ['chat-sessions', libraryId] });
```
This causes `ChatSidebarSection` to re-fetch and show the updated auto-title after the first message.

### Completion check

- Thinking dots animate during `'submitted'`, disappear when first token arrives.
- Blinking cursor shows at end of streaming text, disappears on finish.
- "Response stopped." note appears under aborted messages.
- Sidebar session title updates after first message stream completes.

---

## Phase 23 - Accessibility

Target: WCAG 2.1 AA.

| Requirement | Where | Implementation |
|-------------|-------|----------------|
| Page landmark | `ChatView` | `<main aria-label="Chat">` |
| Messages region | `ChatMessageList` | `<section aria-label="Messages" aria-live="polite" aria-atomic="false">` |
| Input label | `ChatInput` | `<label htmlFor="chat-input" className="sr-only">Message</label>` |
| Input field | `ChatInput` | `id="chat-input"` on textarea |
| Send button | `ChatInput` | `aria-label="Send message"` |
| Stop button | `ChatInput` | `aria-label="Stop generating"` |
| Copy button | `ChatMessage` | `aria-label="Copy message"` |
| Sources section | `ChatSources` | `aria-label="Sources"` on wrapper |
| Timestamp links | `ChatSources` | `aria-label="Jump to {label} in {title}"` |
| Thinking indicator | `ChatMessageList` | `role="status" aria-label="Generating response"` |
| Error message | `ChatInput` | `role="alert"` on error bar |
| Focus after send | `ChatView` | `useEffect` that focuses textarea after `sendMessage` |
| Keyboard: send | `ChatInput` | `Enter` (no shift) submits |
| Keyboard: newline | `ChatInput` | `Shift+Enter` inserts newline |
| Keyboard: stop | `ChatInput` | `Escape` calls `onStop` when active |
| Contrast | all | Verify all text passes 4.5:1 against background in both themes |

### Completion check

- Full keyboard navigation: send message, stop, tab to timestamp links, copy.
- Screen reader announces new messages via `aria-live` region.
- Screen reader announces thinking state via `role="status"`.
- Error message announced via `role="alert"`.

---

## Phase 24 - Frontend verification

Run after all UI phases are complete:

1. `npm run typecheck`
2. `npm run lint`
3. `npm run build`

Manual verification checklist:

1. Navigate to a library with ready videos → chat CTA appears.
2. Click "New chat" → session created, navigated to `/library/[id]/chat/[sessionId]`.
3. Session appears in sidebar as "New chat".
4. Submit a message → thinking indicator (3 dots) → streaming text appears progressively.
5. Sidebar session title updates to auto-title after first message stream completes.
6. Sources block appears below assistant response with correct video titles and timestamp links.
7. Click a timestamp → opens `https://youtube.com/watch?v=...&t=...` in new tab at correct time.
8. Click "Stop" mid-stream → response stops, "Response stopped." note appears.
9. Close browser tab mid-stream, reopen → partial message visible with "Response stopped." note.
10. Reload the page → full conversation history restored, session resumes correctly.
11. Suggestion chips on empty state → populate input, do not auto-submit.
12. Create a second session → both in sidebar, sorted newest first.
13. Keyboard only: `Enter` sends, `Shift+Enter` adds newline, `Escape` stops streaming.
14. Screen reader: new messages announced, thinking state announced, sources navigable by tab.
15. Error state: disconnect from network, submit → error bar appears with "Try again" button.

---

## File inventory

### New files

```
src/features/chat/
  types.ts
  api.ts
  transform.ts
  useChatSessions.ts
  useCreateChatSession.ts
  ChatSidebarSection.tsx
  ChatView.tsx
  ChatMessageList.tsx
  ChatMessage.tsx
  ChatInput.tsx
  ChatSources.tsx
  EmptyChatState.tsx

src/features/libraries/
  LibraryChatGateway.tsx

src/app/(app)/library/[libraryId]/chat/[sessionId]/
  page.tsx
  loading.tsx
```

### Modified files

```
src/features/navigation/AppSidebar.tsx          add ChatSidebarSection
src/app/(app)/library/[libraryId]/page.tsx      add LibraryChatGateway
package.json                                    add ai, @ai-sdk/react, @ai-sdk/openai, react-markdown, remark-gfm
AGENTS.md                                       add AI SDK to locked stack choices
docs/tasks.md                                   mark chat features complete
```

---

## Definition of done

UI implementation is complete when all of the following are true:

1. Chat is accessible at `/library/[libraryId]/chat/[sessionId]` with correct 404 handling.
2. `useChat` streams responses live with thinking indicator and blinking cursor.
3. Sources render as structured UI with clickable YouTube timestamp links.
4. Session titles auto-update in sidebar after first message.
5. All session states (empty, streaming, aborted, error) have correct UI feedback.
6. WCAG 2.1 AA requirements are met for the chat interface.
7. `npm run typecheck`, `npm run lint`, and `npm run build` all pass.
8. `docs/tasks.md` marks library chat and chat history as complete.
