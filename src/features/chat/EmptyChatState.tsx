import { MessageSquare } from "lucide-react";

const SUGGESTIONS = [
  "What are the main themes across these sources?",
  "What tools or tactics are mentioned most?",
  "What questions does this content answer?",
  "Summarize the key points in this library.",
];

type EmptyChatStateProps = {
  onSuggestion: (text: string) => void;
};

export function EmptyChatState({ onSuggestion }: EmptyChatStateProps) {
  return (
    <div className="mx-auto max-w-sm px-6 py-24 text-center">
      <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl border bg-card">
        <MessageSquare size={20} className="text-muted-foreground" aria-hidden="true" />
      </div>
      <h1 className="text-lg font-semibold">Ask anything about this library</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Questions are answered across all ready content in this library.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestion(suggestion)}
            className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
