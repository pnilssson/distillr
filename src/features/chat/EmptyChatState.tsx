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
      <MessageSquare size={32} className="mx-auto" />
      <h1 className="mt-4 text-lg font-semibold">Ask anything about this library</h1>
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
